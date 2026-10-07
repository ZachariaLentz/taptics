import React from "react";
import renderer, { act, ReactTestRenderer } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlayerProvider, usePlayer } from "../lib/PlayerProvider";
import { readPlayer, writePlayer } from "../lib/storage";
import { Completion } from "../lib/engine";
const mockRpc = jest.fn<Promise<unknown>, unknown[]>(
  () => new Promise(() => undefined),
);
jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: {
          session: { user: { id: "account", email: "test@example.com" } },
        },
        error: null,
      })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "guest" }));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
let player!: ReturnType<typeof usePlayer>;
function Probe() {
  const value = usePlayer();
  React.useEffect(() => {
    player = value;
  });
  return null;
}
test("a stalled cloud award never blocks durable local progress or loses a concurrent completion", async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  const training: Completion = {
    id: "pending-training",
    kind: "training",
    date: "2026-10-06",
    createdAt: "2026-10-06T12:00:00Z",
    level: 1,
    correct: 7,
  };
  await writePlayer("account", { events: [training], pending: [training.id] });
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <PlayerProvider>
        <Probe />
      </PlayerProvider>,
    );
  });
  expect(player.ready).toBe(true);
  expect(mockRpc).toHaveBeenCalledTimes(1);
  expect(player.syncing).toBe(true);
  const daily: Completion = {
    ...training,
    id: "new-daily",
    kind: "daily",
    correct: 1,
  };
  await act(async () => {
    await player.save(daily);
  });
  expect((await readPlayer("account")).events).toEqual([training, daily]);
  expect(player.stats.xp).toBe(115);
  expect(player.data.pending).toEqual(["pending-training", "new-daily"]);
  act(() => tree.unmount());
  jest.useRealTimers();
});
