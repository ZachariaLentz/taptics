import React from "react";
import renderer, { act, ReactTestRenderer } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PlayerProvider, usePlayer } from "../lib/PlayerProvider";
import { Completion, dailyPuzzle } from "../lib/engine";
import { readPlayer, writePlayer } from "../lib/storage";
let mockUser: { id: string; email: string } | null;
let mockListener:
  | ((event: string, session: { user: typeof mockUser } | null) => void)
  | undefined;
let mockRemote: Completion[];
let mockOffline: boolean;
let mockLoseAck: string | null;
let mockForeignIds: Set<string>;
let mockAwards: number;
const mockRpc = jest.fn(
  async (_name: string, args: Record<string, unknown>) => {
    if (mockOffline) return { error: { code: "NETWORK", message: "Offline" } };
    const event: Completion = {
      id: args.p_id as string,
      kind: args.p_kind as Completion["kind"],
      date: args.p_date as string,
      level: args.p_level as number,
      correct: args.p_correct as number,
      createdAt: args.p_created_at as string,
      selected: args.p_selected as number,
      puzzle: args.p_puzzle as Completion["puzzle"],
    };
    if (mockForeignIds.has(event.id))
      return {
        error: { code: "23505", message: "UUID belongs to another account" },
      };
    if (
      !mockRemote.some(
        (existing) =>
          existing.id === event.id ||
          (event.kind === "daily" &&
            existing.kind === "daily" &&
            event.date === existing.date),
      )
    ) {
      mockRemote.push(event);
      mockAwards++;
    }
    if (mockLoseAck === event.id) {
      mockLoseAck = null;
      mockOffline = true;
      return { error: { code: "NETWORK", message: "Lost acknowledgement" } };
    }
    return { error: null };
  },
);
jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: mockUser ? { user: mockUser } : null },
        error: null,
      })),
      onAuthStateChange: (listener: typeof mockListener) => {
        mockListener = listener;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
    rpc: (...args: Parameters<typeof mockRpc>) => mockRpc(...args),
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        range: async () => ({
          error: mockOffline ? { message: "Offline" } : null,
          data: mockRemote
            .filter(
              (event) =>
                event.kind ===
                (table === "training_sessions" ? "training" : "daily"),
            )
            .map((event) => ({
              id: event.id,
              user_id: mockUser?.id,
              played_on: event.date,
              created_at: event.createdAt,
              level: event.level,
              correct:
                event.kind === "daily" ? Boolean(event.correct) : event.correct,
              selected: event.selected,
              puzzle: event.puzzle,
            })),
        }),
      };
      return query;
    },
  },
}));
jest.mock("expo-crypto", () => ({
  randomUUID: () => "guest",
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: async (_algorithm: string, value: string) =>
    require("node:crypto").createHash("sha256").update(value).digest("hex"),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
let player!: ReturnType<typeof usePlayer>;
function Probe() {
  player = usePlayer();
  return null;
}
const date = new Date().toISOString().slice(0, 10);
const training: Completion = {
  id: "00000000-0000-4000-8000-000000000001",
  kind: "training",
  date,
  createdAt: `${date}T01:00:00Z`,
  level: 1,
  correct: 7,
};
const puzzle = dailyPuzzle("guest", date);
const daily: Completion = {
  id: "00000000-0000-4000-8000-000000000002",
  kind: "daily",
  date,
  createdAt: `${date}T02:00:00Z`,
  level: 4,
  correct: 1,
  selected: puzzle.answer,
  puzzle,
};
let tree: ReactTestRenderer;
async function mount() {
  await act(async () => {
    tree = renderer.create(
      <PlayerProvider>
        <Probe />
      </PlayerProvider>,
    );
  });
}
function unmount() {
  act(() => tree.unmount());
}
beforeEach(async () => {
  await AsyncStorage.clear();
  mockUser = { id: "account", email: "test@example.com" };
  mockRemote = [];
  mockOffline = false;
  mockLoseAck = null;
  mockForeignIds = new Set();
  mockAwards = 0;
  mockRpc.mockClear();
  await writePlayer("guest", {
    events: [training, daily],
    pending: [training.id, daily.id],
  });
});
afterEach(() => unmount());
test("guest signup offers existing completions without silently importing; explicit import survives logout", async () => {
  mockUser = null;
  await mount();
  expect(player.stats.xp).toBe(115);
  await act(async () => {
    mockUser = { id: "account", email: "test@example.com" };
    mockListener?.("SIGNED_IN", { user: mockUser });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(player.id).toBe("account");
  expect(player.guestEvents).toHaveLength(2);
  expect(player.stats.xp).toBe(0);
  expect(mockRpc).not.toHaveBeenCalled();
  let plan!: Awaited<ReturnType<typeof player.prepareGuestImport>>;
  await act(async () => {
    plan = await player.prepareGuestImport();
  });
  await act(async () => {
    await player.importGuestProgress(plan);
  });
  expect(player.data.guestImport).toMatchObject({
    status: "complete",
    confirmed: 2,
  });
  expect(mockAwards).toBe(2);
  expect(player.stats.xp).toBe(115);
  expect(new Set(mockRpc.mock.calls.map(([, args]) => args.p_id))).toEqual(
    new Set([training.id, daily.id]),
  );
  expect((await readPlayer("guest")).events).toEqual([training, daily]);
  await act(async () => {
    mockUser = null;
    mockListener?.("SIGNED_OUT", null);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(player.id).toBe("guest");
  expect(player.data.events).toEqual([training, daily]);
});
test("existing-account import previews conflicts and keeps account ID and Daily records", async () => {
  mockRemote = [
    { ...training, correct: 10 },
    {
      ...daily,
      id: "account-daily",
      correct: 0,
      selected: puzzle.choices.find((choice) => choice !== puzzle.answer),
    },
  ];
  await mount();
  let plan!: Awaited<ReturnType<typeof player.prepareGuestImport>>;
  await act(async () => {
    plan = await player.prepareGuestImport();
  });
  expect(plan.duplicateIds).toBe(1);
  expect(plan.dailyDates).toEqual([date]);
  expect(plan.additions).toEqual([]);
  await act(async () => {
    await player.importGuestProgress(plan);
  });
  expect(mockRpc).not.toHaveBeenCalled();
  expect(player.stats.xp).toBe(125);
  expect(player.data.guestImport?.status).toBe("complete");
});
test("offline confirmation and restart keep guest data and retry through the award RPC once", async () => {
  await mount();
  let plan!: Awaited<ReturnType<typeof player.prepareGuestImport>>;
  await act(async () => {
    plan = await player.prepareGuestImport();
  });
  mockOffline = true;
  await act(async () => {
    await player.importGuestProgress(plan);
  });
  expect(player.data.guestImport?.status).toBe("pending");
  expect(player.data.pending).toHaveLength(2);
  expect(mockAwards).toBe(0);
  expect((await readPlayer("guest")).events).toEqual([training, daily]);
  unmount();
  await mount();
  expect(player.data.guestImport?.status).toBe("pending");
  mockOffline = false;
  await act(async () => {
    expect(await player.sync()).toBe(true);
  });
  expect(player.data.guestImport?.status).toBe("complete");
  expect(mockAwards).toBe(2);
  await act(async () => {
    await player.sync();
  });
  expect(mockAwards).toBe(2);
  expect(player.data.pending).toEqual([]);
});
test("partial upload with lost server acknowledgement resumes without duplicate awards", async () => {
  await mount();
  let plan!: Awaited<ReturnType<typeof player.prepareGuestImport>>;
  await act(async () => {
    plan = await player.prepareGuestImport();
  });
  mockLoseAck = training.id;
  await act(async () => {
    await player.importGuestProgress(plan);
  });
  expect(player.data.guestImport?.status).toBe("pending");
  expect(mockAwards).toBe(2);
  unmount();
  mockOffline = false;
  await mount();
  expect(player.data.guestImport?.status).toBe("complete");
  expect(mockAwards).toBe(2);
  expect(
    mockRpc.mock.calls.filter(([, args]) => args.p_id === training.id),
  ).toHaveLength(2);
  expect((await readPlayer("guest")).events).toEqual([training, daily]);
});
test("UUID already belonging to another account is remapped only for imported events and persists across reloads", async () => {
  mockForeignIds.add(training.id);
  await mount();
  let plan!: Awaited<ReturnType<typeof player.prepareGuestImport>>;
  await act(async () => {
    plan = await player.prepareGuestImport();
  });
  await act(async () => {
    await player.importGuestProgress(plan);
  });
  const imported = player.data.events.find(
    (event) => event.kind === "training",
  )!;
  expect(imported.id).not.toBe(training.id);
  expect(player.data.guestImport?.status).toBe("complete");
  expect(mockAwards).toBe(2);
  expect(player.data.guestImport?.sourceIds).toContain(training.id);
  unmount();
  await mount();
  await act(async () => {
    await player.sync();
  });
  expect(mockAwards).toBe(2);
  expect((await readPlayer("guest")).events[0].id).toBe(training.id);
});
test("reviewing while offline leaves both profiles untouched and makes no migration receipt", async () => {
  await mount();
  mockOffline = true;
  await act(async () => {
    await expect(player.prepareGuestImport()).rejects.toThrow("Connect");
  });
  expect(player.data.events).toEqual([]);
  expect(player.data.guestImport).toBeUndefined();
  expect((await readPlayer("guest")).events).toEqual([training, daily]);
});

test("an account switch invalidates reviewed consent before the next upload", async () => {
  await mount();
  let plan!: Awaited<ReturnType<typeof player.prepareGuestImport>>;
  await act(async () => {
    plan = await player.prepareGuestImport();
  });
  await act(async () => {
    mockUser = { id: "different-account", email: "different@example.com" };
    mockListener?.("SIGNED_IN", { user: mockUser });
    await expect(player.importGuestProgress(plan)).rejects.toThrow(
      "Account changed",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(mockRpc).not.toHaveBeenCalled();
  expect(player.id).toBe("different-account");
  expect((await readPlayer("guest")).events).toEqual([training, daily]);
});

test("another device completing Daily after review wins without a second Daily reward", async () => {
  await mount();
  let plan!: Awaited<ReturnType<typeof player.prepareGuestImport>>;
  await act(async () => {
    plan = await player.prepareGuestImport();
  });
  const otherDevice = {
    ...daily,
    id: "other-device-daily",
    correct: 0,
    selected: puzzle.choices.find((choice) => choice !== puzzle.answer),
  };
  mockRemote.push(otherDevice);
  await act(async () => {
    await player.importGuestProgress(plan);
  });
  expect(player.stats.todayDaily).toEqual(otherDevice);
  expect(
    player.data.events.filter((event) => event.kind === "daily"),
  ).toHaveLength(1);
  expect(player.data.guestImport).toMatchObject({
    status: "complete",
    confirmed: 1,
  });
  expect(mockAwards).toBe(1);
  expect((await readPlayer("guest")).events).toEqual([training, daily]);
});

test("failed local import persistence cannot upload rewards or destroy guest progress", async () => {
  await mount();
  let plan!: Awaited<ReturnType<typeof player.prepareGuestImport>>;
  await act(async () => {
    plan = await player.prepareGuestImport();
  });
  jest
    .spyOn(AsyncStorage, "setItem")
    .mockRejectedValueOnce(new Error("Disk full"));
  await act(async () => {
    await expect(player.importGuestProgress(plan)).rejects.toThrow("Disk full");
  });
  expect(mockRpc).not.toHaveBeenCalled();
  expect((await readPlayer("account")).events).toEqual([]);
  expect((await readPlayer("guest")).events).toEqual([training, daily]);
});
