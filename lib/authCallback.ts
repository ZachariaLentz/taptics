import type { SupabaseClient } from "@supabase/supabase-js";

export const CONFIRM_REDIRECT = "taptics://auth/confirm";
export const RECOVERY_REDIRECT = "taptics://auth/recovery";
export type CallbackKind = "confirmation" | "recovery";
export type AuthCallback = {
  kind: CallbackKind;
  code: string;
};

// Accept only our two native destinations. Never log URLs: they contain credentials.
export function parseAuthCallback(raw: string): AuthCallback | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (
    url.protocol !== "taptics:" ||
    url.hostname !== "auth" ||
    !["/confirm", "/recovery"].includes(url.pathname) ||
    url.port ||
    url.username ||
    url.password
  )
    return null;
  const params = url.searchParams;
  if (
    params.has("error") ||
    params.has("error_code") ||
    new URLSearchParams(url.hash.slice(1)).has("error")
  )
    throw new Error(
      "This email link has expired or is invalid. Request a new email from Login.",
    );
  const codes = params.getAll("code");
  if (codes.length !== 1 || !codes[0] || url.hash)
    throw new Error(
      "This email link is incomplete. Request a new email from Login.",
    );
  return {
    kind: url.pathname === "/recovery" ? "recovery" : "confirmation",
    code: codes[0],
  };
}

export async function exchangeAuthCallback(
  auth: Pick<
    SupabaseClient["auth"],
    "exchangeCodeForSession" | "onAuthStateChange"
  >,
  callback: AuthCallback,
) {
  let recoveryUser: string | null = null;
  const subscription = auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") recoveryUser = session?.user.id ?? null;
  });
  try {
    const { data, error } = await auth.exchangeCodeForSession(callback.code);
    if (error || !data.session)
      throw new Error(
        "Could not verify this email link. Open the latest email on the device that requested it, or request a new one from Login.",
      );
    // The SDK emits this only for its stored PKCE recovery intent. The route alone is insufficient.
    const recovery = recoveryUser === data.session.user.id;
    if ((callback.kind === "recovery") !== recovery)
      throw new Error(
        "This link does not match the requested email action. Request a new email from Login.",
      );
    return { userId: data.session.user.id, kind: callback.kind };
  } finally {
    subscription.data.subscription.unsubscribe();
  }
}

export async function updateRecoveryPassword(
  auth: Pick<SupabaseClient["auth"], "getSession" | "updateUser">,
  recoveryUserId: string | null,
  password: string,
  isCurrent: () => boolean = () => true,
) {
  if (!recoveryUserId)
    throw new Error("Open a valid password reset email first.");
  if (password.length < 8) throw new Error("Use at least 8 characters.");
  const { data, error } = await auth.getSession();
  if (error || !isCurrent() || data.session?.user.id !== recoveryUserId)
    throw new Error(
      "Your account changed. Request a new password reset email.",
    );
  const result = await auth.updateUser({ password });
  if (result.error) throw result.error;
}
