import React from "react";
import renderer, { act, ReactTestRenderer } from "react-test-renderer";
import { TextInput } from "react-native";
import { Button } from "../components/ui";
import AuthCallbackScreen from "../screens/AuthCallbackScreen";
jest.mock("../lib/PlayerProvider", () => ({ usePlayer: jest.fn() }));
let mockStatus = "recovery";
const mockUpdate = jest.fn(async () => {
  mockStatus = "confirmed";
});
const mockReplace = jest.fn();
jest.mock("../lib/AuthProvider", () => ({
  useAuthFlow: () => ({
    status: mockStatus,
    message: "",
    updatePassword: mockUpdate,
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
}));
function button(tree: ReactTestRenderer, title: string) {
  return tree.root
    .findAllByType(Button)
    .find((node) => node.props.title === title)!;
}
beforeEach(() => {
  mockStatus = "recovery";
  mockUpdate.mockClear();
  mockReplace.mockClear();
});
test("recovery form requires matching passwords, locks double submission and offers Profile after success", async () => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<AuthCallbackScreen />);
  });
  const inputs = tree.root.findAllByType(TextInput);
  act(() => {
    inputs[0].props.onChangeText("new-password");
    inputs[1].props.onChangeText("different");
  });
  await act(async () => {
    button(tree, "Save new password").props.onPress();
  });
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain("Passwords must match.");
  act(() => {
    inputs[1].props.onChangeText("new-password");
  });
  const save = button(tree, "Save new password");
  await act(async () => {
    save.props.onPress();
    save.props.onPress();
  });
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(mockUpdate).toHaveBeenCalledWith("new-password");
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).toContain("Your password was updated.");
  act(() => button(tree, "Continue to Profile").props.onPress());
  expect(mockReplace).toHaveBeenCalledWith("/profile");
  act(() => tree.unmount());
});
test("confirmation cannot display or submit a password recovery form", async () => {
  mockStatus = "confirmed";
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<AuthCallbackScreen />);
  });
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  expect(button(tree, "Save new password")).toBeUndefined();
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain("Your email is confirmed.");
  act(() => tree.unmount());
});
