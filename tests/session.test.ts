import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_STORAGE_KEY, cachedAccount, withTimeout } from "../lib/session";
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
beforeEach(async () => {
  await AsyncStorage.clear();
});
test("offline boot reads only the cached identity and does not expose session tokens", async () => {
  expect(await cachedAccount()).toBeNull();
  await AsyncStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      access_token: "private-token",
      user: {
        id: "account",
        email: "test@example.com",
        user_metadata: { admin: true },
      },
    }),
  );
  expect(await cachedAccount()).toEqual({
    id: "account",
    email: "test@example.com",
  });
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, "invalid");
  expect(await cachedAccount()).toBeNull();
});
test("boot timeout is bounded and successful sessions do not wait", async () => {
  jest.useFakeTimers();
  const pending = withTimeout(new Promise(() => undefined), 5000);
  const assertion = expect(pending).rejects.toThrow("Connection timed out");
  jest.advanceTimersByTime(5000);
  await assertion;
  expect(await withTimeout(Promise.resolve("ready"), 5000)).toBe("ready");
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});
