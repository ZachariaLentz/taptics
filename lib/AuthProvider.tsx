import { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";
import {
  exchangeAuthCallback,
  parseAuthCallback,
  updateRecoveryPassword,
} from "./authCallback";

interface AuthFlow {
  status: "idle" | "checking" | "confirmed" | "recovery" | "error";
  message: string;
  recoveryUserId: string | null;
  updatePassword: (password: string) => Promise<void>;
}
const Context = createContext<AuthFlow | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthFlow["status"]>("idle");
  const [message, setMessage] = useState("");
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  const recovery = useRef<string | null>(null);
  const version = useRef(0);
  const passwordBusy = useRef(false);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const sequence = version;
    let active = true;
    let observedUser: string | null | undefined;
    // Cold-start URLs and live Linking events may deliver the same one-use code.
    const seen = new Set<string>();
    let callbacks = Promise.resolve();
    const subscription = client.auth.onAuthStateChange((event, session) => {
      observedUser = session?.user.id ?? null;
      if (
        event === "SIGNED_OUT" ||
        (recovery.current && session?.user.id !== recovery.current)
      ) {
        version.current++;
        recovery.current = null;
        setRecoveryUserId(null);
        setStatus("idle");
      }
    });
    const handle = (raw: string | null) => {
      if (!active || !raw || seen.has(raw)) return;
      let callback;
      try {
        callback = parseAuthCallback(raw);
      } catch (e) {
        version.current++;
        recovery.current = null;
        setRecoveryUserId(null);
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Invalid email link.");
        return;
      }
      if (!callback) return;
      seen.add(raw);
      const parsed = callback;
      const request = ++version.current;
      recovery.current = null;
      setRecoveryUserId(null);
      setMessage("");
      setStatus("checking");
      callbacks = callbacks.then(async () => {
        if (!active || request !== version.current) return;
        try {
          const result = await exchangeAuthCallback(client.auth, parsed);
          const { data, error } = await client.auth.getSession();
          if (!active || request !== version.current) return;
          if (
            error ||
            data.session?.user.id !== result.userId ||
            (observedUser !== undefined && observedUser !== result.userId)
          )
            throw new Error(
              "Your account changed. Request a new email from Login.",
            );
          if (result.kind === "recovery") {
            recovery.current = result.userId;
            setRecoveryUserId(result.userId);
            setStatus("recovery");
          } else setStatus("confirmed");
        } catch (e) {
          if (!active || request !== version.current) return;
          setStatus("error");
          setMessage(
            e instanceof Error ? e.message : "Unable to verify email link.",
          );
        }
      });
    };
    const listener = Linking.addEventListener("url", ({ url }) => handle(url));
    void Linking.getInitialURL()
      .then(handle)
      .catch(() => {
        if (active) {
          setStatus("error");
          setMessage("Could not open email link. Try opening it again.");
        }
      });
    return () => {
      active = false;
      sequence.current++;
      listener.remove();
      subscription.data.subscription.unsubscribe();
    };
  }, []);
  const updatePassword = async (password: string) => {
    if (!supabase || passwordBusy.current)
      throw new Error("Please wait and try again.");
    passwordBusy.current = true;
    const request = version.current;
    try {
      await updateRecoveryPassword(
        supabase.auth,
        recovery.current,
        password,
        () => request === version.current,
      );
      if (request !== version.current)
        throw new Error("Your account changed. Return to Login.");
      recovery.current = null;
      setRecoveryUserId(null);
      setStatus("confirmed");
    } finally {
      passwordBusy.current = false;
    }
  };
  return (
    <Context.Provider
      value={{ status, message, recoveryUserId, updatePassword }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuthFlow() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AuthProvider.");
  return value;
}
