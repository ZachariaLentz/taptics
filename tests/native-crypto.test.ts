import { installNativeCrypto } from "../lib/nativeCrypto";
import * as ExpoCrypto from "expo-crypto";
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("expo-crypto", () => ({
  getRandomValues: jest.fn((values) => {
    values.fill(7);
    return values;
  }),
  digest: jest.fn(async () => new Uint8Array([1, 2, 3]).buffer),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));
test("native PKCE uses Expo secure randomness and SHA-256 without replacing existing crypto", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  try {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
    });
    installNativeCrypto();
    expect(globalThis.crypto.getRandomValues(new Uint32Array(2))).toEqual(
      new Uint32Array([7, 7]),
    );
    const input = new Uint8Array([9]);
    await globalThis.crypto.subtle.digest("SHA-256", input);
    expect(ExpoCrypto.digest).toHaveBeenCalledWith("SHA-256", input);
    await expect(
      globalThis.crypto.subtle.digest("SHA-1", input),
    ).rejects.toThrow("Unsupported");
    const supplied = globalThis.crypto;
    installNativeCrypto();
    expect(globalThis.crypto).toBe(supplied);
  } finally {
    if (original) Object.defineProperty(globalThis, "crypto", original);
    else Reflect.deleteProperty(globalThis, "crypto");
  }
});
