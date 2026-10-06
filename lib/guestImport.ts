import * as Crypto from "expo-crypto";
import { Completion, PASS_SCORE, progress } from "./engine";
import { addCompletion, PlayerData } from "./storage";
export interface GuestImportReceipt {
  guestId: string;
  sourceIds: string[];
  imported: { id: string; kind: Completion["kind"]; date: string }[];
  status: "pending" | "complete";
  skipped: number;
  confirmed?: number;
}
export interface GuestImportPlan {
  accountId: string;
  guestId: string;
  accountSnapshot: string;
  guestSnapshot: string;
  sourceIds: string[];
  additions: Completion[];
  duplicateIds: number;
  dailyDates: string[];
  unsupported: number;
  existingCount: number;
}
export const completionSnapshot = (events: Completion[]) =>
  JSON.stringify(
    [...events].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    ),
  );
export function unreviewedGuestEvents(
  guest: Completion[],
  receipt?: GuestImportReceipt,
  guestId?: string,
) {
  const handled =
    receipt && receipt.guestId === guestId
      ? new Set(receipt.sourceIds)
      : new Set<string>();
  return guest.filter((event) => !handled.has(event.id));
}
// Account records always win. Guest records have a stable order, including duplicates and clock changes.
export function planGuestImport(
  accountId: string,
  guestId: string,
  account: PlayerData,
  guest: PlayerData,
  now = new Date(),
): GuestImportPlan {
  const candidates = unreviewedGuestEvents(
    guest.events,
    account.guestImport,
    guestId,
  ).sort(
    (a, b) =>
      (a.kind === "training" ? a.level : 0) -
        (b.kind === "training" ? b.level : 0) ||
      a.createdAt.localeCompare(b.createdAt) ||
      completionSnapshot([a]).localeCompare(completionSnapshot([b])),
  );
  const ids = new Set(account.events.map((event) => event.id));
  const dailyDates = new Set(
    account.events
      .filter((event) => event.kind === "daily")
      .map((event) => event.date),
  );
  let level = progress(account.events, now.toISOString().slice(0, 10)).level;
  const plan: GuestImportPlan = {
    accountId,
    guestId,
    accountSnapshot: completionSnapshot(account.events),
    guestSnapshot: completionSnapshot(guest.events),
    sourceIds: [...new Set(candidates.map((event) => event.id))],
    additions: [],
    duplicateIds: 0,
    dailyDates: [],
    unsupported: 0,
    existingCount: account.events.length,
  };
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  for (const event of candidates) {
    if (ids.has(event.id)) {
      plan.duplicateIds++;
      continue;
    }
    ids.add(event.id);
    if (event.kind === "daily" && dailyDates.has(event.date)) {
      plan.dailyDates.push(event.date);
      continue;
    }
    const date = Date.parse(`${event.date}T00:00:00Z`);
    if (
      !Number.isFinite(date) ||
      date < today - 366 * 86400000 ||
      date > today + 86400000 ||
      !Number.isFinite(Date.parse(event.createdAt)) ||
      Date.parse(event.createdAt) > now.getTime() + 86400000 ||
      (event.kind === "training" && event.level > level)
    ) {
      plan.unsupported++;
      continue;
    }
    plan.additions.push(event);
    if (event.kind === "daily") dailyDates.add(event.date);
    else if (event.correct >= PASS_SCORE)
      level = Math.min(100, Math.max(level, event.level + 1));
  }
  return plan;
}
export function queueGuestImport(
  account: PlayerData,
  guest: PlayerData,
  plan: GuestImportPlan,
): PlayerData {
  if (account.guestImport?.status === "pending")
    throw new Error("Finish the pending import before reviewing another.");
  if (
    completionSnapshot(account.events) !== plan.accountSnapshot ||
    completionSnapshot(guest.events) !== plan.guestSnapshot
  )
    throw new Error(
      "Progress changed since the review. Review guest progress again before importing.",
    );
  const previous =
    account.guestImport?.guestId === plan.guestId
      ? account.guestImport.sourceIds
      : [];
  const next = plan.additions.reduce(addCompletion, account);
  return {
    ...next,
    guestImport: {
      guestId: plan.guestId,
      sourceIds: [...new Set([...previous, ...plan.sourceIds])],
      imported: plan.additions.map(({ id, kind, date }) => ({
        id,
        kind,
        date,
      })),
      status: "pending",
      skipped: plan.duplicateIds + plan.dailyDates.length + plan.unsupported,
    },
  };
}
export function confirmGuestImport(
  data: PlayerData,
  remote: Completion[],
): PlayerData {
  const receipt = data.guestImport;
  if (
    !receipt ||
    receipt.status !== "pending" ||
    receipt.imported.some((event) => data.pending.includes(event.id))
  )
    return data;
  if (
    !receipt.imported.every((event) =>
      remote.some(
        (stored) =>
          stored.kind === event.kind &&
          (event.kind === "daily"
            ? stored.date === event.date
            : stored.id === event.id),
      ),
    )
  )
    return data;
  return {
    ...data,
    guestImport: {
      ...receipt,
      status: "complete",
      confirmed: receipt.imported.filter((event) =>
        remote.some(
          (stored) => stored.kind === event.kind && stored.id === event.id,
        ),
      ).length,
    },
  };
}
// A guest UUID may already belong to another account. Remap only an explicit import, deterministically.
export async function accountImportId(
  accountId: string,
  event: Completion,
): Promise<string> {
  const hex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `taptics-guest-import-v1:${accountId}:${event.kind}:${event.id}`,
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function remapImportedEvent(
  data: PlayerData,
  oldId: string,
  newId: string,
): PlayerData {
  const existing = data.events.some((event) => event.id === newId);
  return {
    ...data,
    events: data.events.flatMap((event) =>
      event.id === oldId
        ? existing
          ? []
          : [{ ...event, id: newId }]
        : [event],
    ),
    pending: [
      ...new Set(data.pending.map((id) => (id === oldId ? newId : id))),
    ],
    guestImport: data.guestImport
      ? {
          ...data.guestImport,
          imported: data.guestImport.imported.map((event) =>
            event.id === oldId ? { ...event, id: newId } : event,
          ),
        }
      : undefined,
  };
}
