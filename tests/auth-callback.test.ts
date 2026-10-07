import {
  CONFIRM_REDIRECT,
  RECOVERY_REDIRECT,
  parseAuthCallback,
  exchangeAuthCallback,
  updateRecoveryPassword,
} from "../lib/authCallback";
import type { SupabaseClient } from "@supabase/supabase-js";

test("parses only exact native auth destinations with one PKCE code", () => {
  expect(parseAuthCallback(`${CONFIRM_REDIRECT}?code=a%2Bb`)).toEqual({
    kind: "confirmation",
    code: "a+b",
  });
  expect(parseAuthCallback(`${RECOVERY_REDIRECT}?code=reset`)).toEqual({
    kind: "recovery",
    code: "reset",
  });
  for (const url of [
    "garbage",
    "https://auth/confirm?code=x",
    "other://auth/recovery?code=x",
    "taptics://evil/confirm?code=x",
    "taptics://auth/confirm/extra?code=x",
    "taptics://user@auth/confirm?code=x",
  ])
    expect(parseAuthCallback(url)).toBeNull();
});
test("rejects expired, missing, ambiguous and legacy token callbacks without exposing credentials", () => {
  for (const suffix of [
    "",
    "?code=",
    "?code=secret&code=second",
    "?error=access_denied&error_description=secret",
    "#error=access_denied",
    "#access_token=secret&refresh_token=secret",
    "?code=secret#access_token=secret",
  ])
    expect(() => parseAuthCallback(CONFIRM_REDIRECT + suffix)).toThrow(
      /email|link/,
    );
});
function exchange(redirectType: string | null, error: unknown = null) {
  let listener: (event: string, session: { user: { id: string } }) => void;
  return {
    onAuthStateChange: jest.fn((fn) => {
      listener = fn;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    exchangeCodeForSession: jest.fn(async () => {
      const session = { user: { id: "account" } };
      listener(
        redirectType === "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN",
        session,
      );
      return { data: { session }, error };
    }),
  } as unknown as Pick<
    SupabaseClient["auth"],
    "exchangeCodeForSession" | "onAuthStateChange"
  >;
}
test("confirmation exchanges the code for a verified session", async () => {
  const auth = exchange(null);
  expect(
    await exchangeAuthCallback(auth, { kind: "confirmation", code: "code" }),
  ).toEqual({ kind: "confirmation", userId: "account" });
  expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("code");
});
test("password recovery requires SDK/server recovery intent, not just the route", async () => {
  expect(
    await exchangeAuthCallback(exchange("recovery"), {
      kind: "recovery",
      code: "code",
    }),
  ).toEqual({ kind: "recovery", userId: "account" });
  await expect(
    exchangeAuthCallback(exchange(null), { kind: "recovery", code: "code" }),
  ).rejects.toThrow("does not match");
  await expect(
    exchangeAuthCallback(exchange("recovery"), {
      kind: "confirmation",
      code: "code",
    }),
  ).rejects.toThrow("does not match");
  await expect(
    exchangeAuthCallback(exchange(null, { message: "secret" }), {
      kind: "confirmation",
      code: "code",
    }),
  ).rejects.toThrow("Could not verify");
});
test("password changes require a live matching recovery account and valid password", async () => {
  const getSession = jest.fn(async () => ({
    data: { session: { user: { id: "account" } } },
    error: null,
  }));
  const updateUser = jest.fn(async () => ({ data: {}, error: null }));
  const auth = { getSession, updateUser } as unknown as Pick<
    SupabaseClient["auth"],
    "getSession" | "updateUser"
  >;
  await expect(updateRecoveryPassword(auth, null, "password")).rejects.toThrow(
    "reset email",
  );
  await expect(
    updateRecoveryPassword(auth, "account", "short"),
  ).rejects.toThrow("8 characters");
  await expect(
    updateRecoveryPassword(auth, "other", "password"),
  ).rejects.toThrow("account changed");
  await expect(
    updateRecoveryPassword(auth, "account", "password", () => false),
  ).rejects.toThrow("account changed");
  expect(updateUser).not.toHaveBeenCalled();
  await updateRecoveryPassword(auth, "account", "password");
  expect(updateUser).toHaveBeenCalledWith({ password: "password" });
});
