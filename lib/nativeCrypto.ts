import * as ExpoCrypto from "expo-crypto";
import { Platform } from "react-native";

// Supabase PKCE needs secure randomness and SHA-256. Hermes does not provide
// WebCrypto in every native runtime; supply just these operations with Expo.
// Leave browser WebCrypto and any existing native implementation intact.
export function installNativeCrypto() {
  if (Platform.OS === "web") return;
  const existing = globalThis.crypto;
  const crypto = existing ?? ({} as Crypto);
  if (!crypto.getRandomValues)
    Object.defineProperty(crypto, "getRandomValues", {
      value: ExpoCrypto.getRandomValues,
    });
  if (!crypto.subtle) {
    Object.defineProperty(crypto, "subtle", {
      value: {
        digest: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
          const name =
            typeof algorithm === "string" ? algorithm : algorithm.name;
          if (name !== "SHA-256")
            throw new Error("Unsupported native auth digest.");
          return ExpoCrypto.digest(
            ExpoCrypto.CryptoDigestAlgorithm.SHA256,
            data,
          );
        },
      } as SubtleCrypto,
    });
  }
  if (!existing)
    Object.defineProperty(globalThis, "crypto", {
      value: crypto,
      configurable: true,
    });
}
