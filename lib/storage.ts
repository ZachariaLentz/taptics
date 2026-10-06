import AsyncStorage from "@react-native-async-storage/async-storage";
import { Completion, mergeCompletions } from "./engine";
import type { GuestImportReceipt } from "./guestImport";
export interface PlayerData {
  guestImport?: GuestImportReceipt;
  events: Completion[];
  pending: string[];
}
export const emptyData = (): PlayerData => ({ events: [], pending: [] });
export const playerKey = (id: string) => `taptics-v1:${id}`;
export async function readPlayer(id: string): Promise<PlayerData> {
  const raw = await AsyncStorage.getItem(playerKey(id));
  if (!raw) return emptyData();
  const data = JSON.parse(raw) as PlayerData;
  if (!Array.isArray(data.events) || !Array.isArray(data.pending))
    throw new Error(
      "Saved progress is unreadable. Please retry; your data has not been overwritten.",
    );
  return data;
}
export async function writePlayer(id: string, data: PlayerData) {
  await AsyncStorage.setItem(playerKey(id), JSON.stringify(data));
}
export function addCompletion(data: PlayerData, event: Completion): PlayerData {
  if (
    data.events.some(
      (e) =>
        e.id === event.id ||
        (event.kind === "daily" && e.kind === "daily" && e.date === event.date),
    )
  )
    return data;
  return {
    ...data,
    events: mergeCompletions(data.events, [event]),
    pending: [...data.pending, event.id],
  };
}
