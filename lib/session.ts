import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@supabase/supabase-js";
export const AUTH_STORAGE_KEY = "taptics-auth-session";
export type Account = Pick<User, "id" | "email">;
// This cached identity selects local data only. Supabase still authenticates every cloud operation.
export async function cachedAccount(): Promise<Account | null> {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (typeof session.user?.id !== "string") return null;
    return { id: session.user.id, email: session.user.email };
  } catch {
    return null;
  }
}
export async function withTimeout<T>(
  operation: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("Connection timed out.")),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
