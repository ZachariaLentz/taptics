import { Completion, dailyPuzzle, progress } from "../lib/engine";
import { addCompletion, emptyData, PlayerData } from "../lib/storage";
import {
  accountImportId,
  confirmGuestImport,
  planGuestImport,
  queueGuestImport,
  remapImportedEvent,
  unreviewedGuestEvents,
} from "../lib/guestImport";
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: async (_algorithm: string, value: string) =>
    require("node:crypto").createHash("sha256").update(value).digest("hex"),
}));
const now = new Date("2026-10-06T12:00:00Z");
const training = (
  id: string,
  overrides: Partial<Completion> = {},
): Completion => ({
  id,
  kind: "training",
  date: "2026-10-05",
  createdAt: "2026-10-05T12:00:00Z",
  level: 1,
  correct: 7,
  ...overrides,
});
const daily = (id: string, date = "2026-10-06"): Completion => {
  const puzzle = dailyPuzzle("guest", date);
  return {
    id,
    kind: "daily",
    date,
    createdAt: `${date}T12:00:00Z`,
    level: 4,
    correct: 1,
    selected: puzzle.answer,
    puzzle,
  };
};
const player = (events: Completion[]): PlayerData => ({ events, pending: [] });
test("new-account migration preserves completion IDs and derives progress from completions", () => {
  const guest = player([training("pass"), daily("daily")]);
  const before = JSON.stringify(guest);
  const plan = planGuestImport("account", "guest", emptyData(), guest, now);
  const queued = queueGuestImport(emptyData(), guest, plan);
  expect(new Set(queued.events.map((event) => event.id))).toEqual(
    new Set(["pass", "daily"]),
  );
  expect(queued.pending).toHaveLength(2);
  expect(queued.guestImport?.status).toBe("pending");
  expect(progress(queued.events, "2026-10-06")).toMatchObject({
    level: 2,
    xp: 115,
    streak: 2,
  });
  expect(JSON.stringify(guest)).toBe(before);
});
test("existing-account merge keeps account records and deterministically resolves duplicate IDs and Daily dates", () => {
  const accountTraining = training("same", { correct: 10 });
  const accountDaily = { ...daily("account-daily"), correct: 0 };
  const account = player([accountTraining, accountDaily]);
  const guest = player([
    training("same"),
    daily("guest-daily"),
    training("new"),
    training("new"),
    daily("other-daily", "2026-10-05"),
  ]);
  const plan = planGuestImport("account", "guest", account, guest, now);
  expect(plan.duplicateIds).toBe(2);
  expect(plan.dailyDates).toEqual(["2026-10-06"]);
  expect(plan.additions).toHaveLength(2);
  const merged = queueGuestImport(account, guest, plan);
  expect(merged.events.find((event) => event.id === "same")).toEqual(
    accountTraining,
  );
  expect(
    merged.events.filter(
      (event) => event.kind === "daily" && event.date === "2026-10-06",
    ),
  ).toEqual([accountDaily]);
  const permuted = planGuestImport(
    "account",
    "guest",
    account,
    player([...guest.events].reverse()),
    now,
  );
  expect(permuted.additions).toEqual(plan.additions);
  expect(progress(merged.events, "2026-10-06").xp).toBe(240);
});
test("guest duplicate Daily dates select the same record regardless of input order", () => {
  const guest = player([daily("b"), daily("a")]);
  expect(
    planGuestImport("account", "guest", emptyData(), guest, now).additions,
  ).toEqual([daily("a")]);
  expect(
    planGuestImport(
      "account",
      "guest",
      emptyData(),
      player([...guest.events].reverse()),
      now,
    ).additions,
  ).toEqual([daily("a")]);
});
test("dates rejected by the RPC and incomplete level prerequisites are disclosed before consent", () => {
  const guest = player([
    training("too-old", {
      date: "2020-01-01",
      createdAt: "2020-01-01T12:00:00Z",
    }),
    training("missing-pass", { level: 3 }),
    training("future", {
      date: "2030-01-01",
      createdAt: "2030-01-01T12:00:00Z",
    }),
  ]);
  const plan = planGuestImport("account", "guest", emptyData(), guest, now);
  expect(plan.unsupported).toBe(3);
  expect(plan.additions).toEqual([]);
  const valid = planGuestImport(
    "account",
    "guest",
    emptyData(),
    player([
      training("level2", { level: 2, createdAt: "2026-10-04T12:00:00Z" }),
      training("level1"),
    ]),
    now,
  );
  expect(valid.additions.map((event) => event.level)).toEqual([1, 2]);
});
test("review cannot overwrite account or guest progress changed before confirmation", () => {
  const guest = player([training("guest")]);
  const plan = planGuestImport("account", "guest", emptyData(), guest, now);
  expect(() =>
    queueGuestImport(player([training("new-account")]), guest, plan),
  ).toThrow("Progress changed");
  expect(() =>
    queueGuestImport(
      emptyData(),
      player([...guest.events, training("new-guest")]),
      plan,
    ),
  ).toThrow("Progress changed");
});
test("interrupted migration keeps the guest copy, resumes pending state, and requires cloud reconciliation", () => {
  const guest = player([training("first"), daily("second")]);
  const original = JSON.stringify(guest);
  const queued = queueGuestImport(
    emptyData(),
    guest,
    planGuestImport("account", "guest", emptyData(), guest, now),
  );
  const restored: PlayerData = JSON.parse(JSON.stringify(queued));
  expect(
    confirmGuestImport(restored, restored.events).guestImport?.status,
  ).toBe("pending");
  const acknowledged = { ...restored, pending: [] };
  expect(confirmGuestImport(acknowledged, []).guestImport?.status).toBe(
    "pending",
  );
  const completed = confirmGuestImport(acknowledged, acknowledged.events);
  expect(completed.guestImport).toMatchObject({
    status: "complete",
    confirmed: 2,
  });
  expect(JSON.stringify(guest)).toBe(original);
  expect(() =>
    queueGuestImport(
      restored,
      guest,
      planGuestImport("account", "guest", restored, guest, now),
    ),
  ).toThrow("pending import");
});
test("migration retries, subsequent guest play, and a server-side Daily collision remain idempotent", () => {
  const guest = player([training("first"), daily("second")]);
  const queued = queueGuestImport(
    emptyData(),
    guest,
    planGuestImport("account", "guest", emptyData(), guest, now),
  );
  const remote = [training("first"), daily("another-device-daily")];
  const completed = confirmGuestImport({ ...queued, pending: [] }, remote);
  expect(completed.guestImport).toMatchObject({
    status: "complete",
    confirmed: 1,
  });
  expect(
    unreviewedGuestEvents(guest.events, completed.guestImport, "guest"),
  ).toEqual([]);
  expect(
    planGuestImport("account", "guest", completed, guest, now).additions,
  ).toEqual([]);
  const extended = addCompletion(guest, training("new-workout"));
  const next = planGuestImport("account", "guest", completed, extended, now);
  expect(next.additions.map((event) => event.id)).toEqual(["new-workout"]);
  expect(
    queueGuestImport(completed, extended, next).guestImport?.sourceIds,
  ).toHaveLength(3);
});
test("foreign-owned UUIDs receive a stable account-specific replacement without changing the guest copy", async () => {
  const event = training("original");
  const guest = player([event]);
  const queued = queueGuestImport(
    emptyData(),
    guest,
    planGuestImport("account", "guest", emptyData(), guest, now),
  );
  const id = await accountImportId("account", event);
  expect(id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(await accountImportId("account", event)).toBe(id);
  expect(await accountImportId("different-account", event)).not.toBe(id);
  const remapped = remapImportedEvent(queued, event.id, id);
  expect(remapped.pending).toEqual([id]);
  expect(remapped.guestImport?.imported[0].id).toBe(id);
  expect(guest.events[0].id).toBe("original");
});
