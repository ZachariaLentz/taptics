import React from "react";
import renderer, { act, ReactTestRenderer } from "react-test-renderer";
import { Pressable } from "react-native";
import FlashScreen from "../screens/FlashScreen";
import ScoreScreen from "../screens/ScoreScreen";
import { generatePuzzle } from "../lib/engine";
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockReplace = jest.fn();
const mockFeedback = jest.fn();
jest.mock("../lib/PlayerProvider", () => ({
  usePlayer: () => ({
    id: "guest",
    user: null,
    save: mockSave,
    stats: { level: 6, streak: 1 },
    data: { events: [], pending: [] },
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ id: "missing" }),
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "test-session" }));
jest.mock("../lib/useSoundEffects", () => ({
  useSoundEffects: () => ({ feedback: mockFeedback, flash: jest.fn() }),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
}));
const button = (tree: ReactTestRenderer, label: string) =>
  tree.root
    .findAllByType(Pressable)
    .find((node) => node.props.accessibilityLabel === label)!;
beforeEach(() => {
  jest.useFakeTimers();
  mockSave.mockClear();
  mockReplace.mockClear();
  mockFeedback.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
});
test("real Flash UI reveals terms sequentially, locks double taps and counts answer ten before saving once", async () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<FlashScreen />);
  });
  for (let index = 0; index < 10; index++) {
    act(() => {
      button(tree, "Flash the terms").props.onPress();
    });
    const puzzle = generatePuzzle(6, `test-session:${index}`);
    expect(button(tree, String(puzzle.answer))).toBeUndefined();
    for (let term = 0; term < puzzle.terms.length; term++)
      act(() => {
        jest.runOnlyPendingTimers();
      });
    const answer = button(tree, String(puzzle.answer));
    act(() => {
      answer.props.onPress();
      answer.props.onPress();
    });
    expect(mockFeedback).toHaveBeenCalledTimes(index + 1);
    expect(mockSave).not.toHaveBeenCalled();
    if (index < 9) {
      const next = button(tree, "Next round");
      act(() => {
        next.props.onPress();
        next.props.onPress();
      });
    }
  }
  const result = button(tree, "See result • level passed!");
  await act(async () => {
    result.props.onPress();
    result.props.onPress();
  });
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "test-session",
      kind: "training",
      level: 6,
      correct: 10,
    }),
  );
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: "/score",
    params: { id: "test-session" },
  });
  act(() => tree.unmount());
});
test("result screen remount without a persisted result cannot award XP", () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<ScoreScreen />);
  });
  act(() => tree.unmount());
  act(() => {
    tree = renderer.create(<ScoreScreen />);
  });
  expect(mockSave).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
