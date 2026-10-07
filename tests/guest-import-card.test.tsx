import React from "react";
import renderer, { act, ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";
import { Button } from "../components/ui";
import { GuestImportCard } from "../components/GuestImportCard";
import { planGuestImport, queueGuestImport } from "../lib/guestImport";
import { emptyData, PlayerData } from "../lib/storage";
import { Completion } from "../lib/engine";
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
const mockEvent: Completion = {
  id: "guest-completion",
  kind: "training",
  date: "2026-10-06",
  createdAt: "2026-10-06T12:00:00Z",
  level: 1,
  correct: 7,
};
const mockPlan = planGuestImport(
  "account",
  "guest",
  emptyData(),
  { events: [mockEvent], pending: [] },
  new Date("2026-10-06T13:00:00Z"),
);
const mockPrepare = jest.fn(async () => mockPlan);
const mockImport = jest.fn(async () => undefined);
const mockPlayer = {
  user: { id: "account" },
  id: "account",
  data: emptyData() as PlayerData,
  guestEvents: [mockEvent],
  deviceGuestId: "guest",
  prepareGuestImport: mockPrepare,
  importGuestProgress: mockImport,
  syncing: false,
  sync: jest.fn(),
  stats: { sessions: 0 },
};
jest.mock("../lib/PlayerProvider", () => ({ usePlayer: () => mockPlayer }));
const button = (tree: ReactTestRenderer, title: string) =>
  tree.root
    .findAllByType(Button)
    .find((node) => node.props.title === title)!;
beforeEach(() => {
  mockPlayer.data = emptyData();
  mockImport.mockClear();
  mockPrepare.mockClear();
});
test("authentication only offers import; reviewing and declining cannot add completions, confirming requires explicit consent", async () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<GuestImportCard />);
  });
  expect(mockImport).not.toHaveBeenCalled();
  await act(async () => {
    button(tree, "Review guest progress to import").props.onPress();
  });
  expect(mockImport).not.toHaveBeenCalled();
  act(() => {
    button(tree, "Keep account progress without importing").props.onPress();
  });
  expect(mockImport).not.toHaveBeenCalled();
  await act(async () => {
    button(tree, "Review guest progress later").props.onPress();
  });
  const confirm = button(tree, "Merge reviewed guest completions");
  await act(async () => {
    confirm.props.onPress();
    confirm.props.onPress();
  });
  expect(mockImport).toHaveBeenCalledTimes(1);
  expect(mockImport).toHaveBeenCalledWith(mockPlan);
  act(() => tree.unmount());
});
test("queued progress is never described as cloud-confirmed until receipt completion", () => {
  mockPlayer.data = queueGuestImport(
    emptyData(),
    { events: [mockEvent], pending: [] },
    mockPlan,
  );
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<GuestImportCard />);
  });
  const text = () =>
    tree.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat()
      .join(" ");
  expect(text()).toContain("not confirmed in your cloud account yet");
  expect(text()).not.toContain("Guest import confirmed");
  mockPlayer.data = {
    ...mockPlayer.data,
    guestImport: {
      ...mockPlayer.data.guestImport!,
      status: "complete",
      confirmed: 1,
    },
  };
  act(() => tree.update(<GuestImportCard />));
  expect(text()).toContain("Guest import confirmed in your account.");
  act(() => tree.unmount());
});
