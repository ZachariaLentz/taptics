import React from "react";
import renderer, { act, ReactTestRenderer } from "react-test-renderer";
import { Button } from "../components/ui";
import DailyScreen from "../screens/DailyScreen";
import { Completion, dailyPuzzle } from "../lib/engine";
const mockSave = jest.fn();
const mockFeedback = jest.fn();
const mockStats: { todayDaily?: Completion } = {};
jest.mock("../lib/PlayerProvider", () => ({
  usePlayer: () => ({
    id: "guest",
    user: null,
    today: "2026-10-06",
    stats: mockStats,
    save: mockSave,
    data: { pending: [] },
  }),
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "daily-attempt" }));
jest.mock("../lib/useSoundEffects", () => ({
  useSoundEffects: () => ({ feedback: mockFeedback }),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
}));
const button = (tree: ReactTestRenderer, title: string) =>
  tree.root
    .findAllByType(Button)
    .find((node) => node.props.title === title)!;
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-06T12:00:00Z"));
  delete mockStats.todayDaily;
  mockSave.mockReset();
  mockFeedback.mockClear();
});
afterEach(() => jest.useRealTimers());
test("Daily accepts one selection and restored completion has no answer controls or new reward", async () => {
  mockSave.mockImplementation(async (event) => {
    mockStats.todayDaily = event;
  });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<DailyScreen />);
  });
  const choice = button(
    tree,
    String(dailyPuzzle("guest", "2026-10-06").answer),
  );
  await act(async () => {
    choice.props.onPress();
    choice.props.onPress();
  });
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockFeedback).toHaveBeenCalledWith(true);
  act(() => tree.update(<DailyScreen />));
  expect(tree.root.findAllByType(Button)).toHaveLength(0);
  act(() => tree.unmount());
  act(() => {
    tree = renderer.create(<DailyScreen />);
  });
  expect(tree.root.findAllByType(Button)).toHaveLength(0);
  expect(mockSave).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
test("a failed durable save retries the same locked selection and completion ID", async () => {
  mockSave
    .mockRejectedValueOnce(new Error("Disk full"))
    .mockResolvedValueOnce(undefined);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<DailyScreen />);
  });
  await act(async () => {
    button(
      tree,
      String(dailyPuzzle("guest", "2026-10-06").answer),
    ).props.onPress();
  });
  expect(mockFeedback).not.toHaveBeenCalled();
  await act(async () => {
    button(tree, "Retry saving this answer").props.onPress();
  });
  expect(mockSave).toHaveBeenCalledTimes(2);
  expect(mockSave.mock.calls[0][0]).toEqual(mockSave.mock.calls[1][0]);
  expect(mockFeedback).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
