import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { Account, cachedAccount, withTimeout } from "./session";
import * as Crypto from "expo-crypto";
import { Completion, localDate, mergeCompletions, progress } from "./engine";
import {
  addCompletion,
  emptyData,
  PlayerData,
  readPlayer,
  writePlayer,
} from "./storage";
import { supabase } from "./supabase";
interface PlayerContext {
  id: string;
  user: Account | null;
  data: PlayerData;
  ready: boolean;
  error: string | null;
  syncing: boolean;
  today: string;
  stats: ReturnType<typeof progress>;
  save: (event: Completion) => Promise<void>;
  retry: () => Promise<void>;
  sync: () => Promise<void>;
}
const Context = createContext<PlayerContext | null>(null);
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState("");
  const [user, setUser] = useState<Account | null>(null);
  const [data, setData] = useState<PlayerData>(emptyData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [today, setToday] = useState(localDate);
  const current = useRef({ id: "", data: emptyData() });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const generation = useRef(0);
  const guestId = useRef("");
  const syncBusy = useRef(false);
  const retry = useCallback(async () => {
    const version = ++generation.current;
    setReady(false);
    setError(null);
    try {
      let guest = await AsyncStorage.getItem("taptics-guest-id");
      if (!guest) {
        guest = Crypto.randomUUID();
        await AsyncStorage.setItem("taptics-guest-id", guest);
      }
      guestId.current = guest;
      let account: Account | null = null;
      if (supabase) {
        try {
          const response = await withTimeout(supabase.auth.getSession(), 5000);
          if (response.error) throw response.error;
          account = response.data.session?.user ?? null;
        } catch {
          account = await cachedAccount();
        }
      }
      const playerId = account?.id ?? guest;
      await queue.current.catch(() => undefined);
      const saved = await readPlayer(playerId);
      if (version !== generation.current) return;
      current.current = { id: playerId, data: saved };
      setId(playerId);
      setUser(account);
      setData(saved);
      setReady(true);
    } catch (e) {
      if (version === generation.current)
        setError(e instanceof Error ? e.message : "Unable to load progress.");
    }
  }, []);
  const mutate = useCallback(
    async (playerId: string, update: (value: PlayerData) => PlayerData) => {
      const operation = queue.current
        .catch(() => undefined)
        .then(async () => {
          if (current.current.id !== playerId)
            throw new Error(
              "Your account changed. Return Home before starting again.",
            );
          const next = update(current.current.data);
          await writePlayer(playerId, next);
          if (current.current.id !== playerId)
            throw new Error(
              "Account changed while saving. Your result is saved in the previous profile.",
            );
          current.current.data = next;
          setData(next);
        });
      queue.current = operation;
      await operation;
    },
    [],
  );
  const sync = useCallback(async () => {
    if (!supabase || !user || !ready || syncBusy.current) return;
    syncBusy.current = true;
    setSyncing(true);
    const playerId = id;
    try {
      // Network operations never hold the local-save queue, so offline training stays responsive.
      const snapshot = current.current.data;
      for (const event of snapshot.events.filter((e) =>
        snapshot.pending.includes(e.id),
      )) {
        if (current.current.id !== playerId) return;
        const { error: rpcError } = await supabase.rpc("record_completion", {
          p_id: event.id,
          p_kind: event.kind,
          p_date: event.date,
          p_level: event.level,
          p_correct: event.correct,
          p_created_at: event.createdAt,
          p_selected: event.selected ?? null,
          p_puzzle: event.puzzle ?? null,
        });
        if (rpcError) throw rpcError;
        await mutate(playerId, (value) => ({
          ...value,
          pending: value.pending.filter((pending) => pending !== event.id),
        }));
      }
      const readAll = async (
        table: "training_sessions" | "daily_completions",
      ) => {
        const rows = [];
        for (let offset = 0; ; offset += 500) {
          const response = await supabase!
            .from(table)
            .select("*")
            .eq("user_id", playerId)
            .order("created_at")
            .order("id")
            .range(offset, offset + 499);
          if (response.error) throw response.error;
          rows.push(...response.data);
          if (response.data.length < 500) return rows;
        }
      };
      const [training, daily] = await Promise.all([
        readAll("training_sessions"),
        readAll("daily_completions"),
      ]);
      const remote: Completion[] = [
        ...training.map((row) => ({
          id: row.id,
          kind: "training" as const,
          date: row.played_on,
          createdAt: row.created_at,
          level: row.level,
          correct: row.correct,
        })),
        ...daily.map((row) => ({
          id: row.id,
          kind: "daily" as const,
          date: row.played_on,
          createdAt: row.created_at,
          level: 4,
          correct: Number(row.correct),
          selected: row.selected,
          puzzle: row.puzzle,
        })),
      ];
      await mutate(playerId, (value) => {
        const events = mergeCompletions(value.events, remote);
        return {
          events,
          pending: value.pending.filter((pending) =>
            events.some((event) => event.id === pending),
          ),
        };
      });
      if (current.current.id === playerId) setError(null);
    } catch (e) {
      if (current.current.id === playerId)
        setError(
          `Progress is saved on this device. Cloud sync failed: ${e instanceof Error ? e.message : "Check your connection and retry."}`,
        );
    } finally {
      syncBusy.current = false;
      setSyncing(false);
    }
  }, [id, user, ready, mutate]);
  const save = useCallback(
    async (event: Completion) => {
      await mutate(current.current.id, (value) => addCompletion(value, event));
      setError(null);
    },
    [mutate],
  );
  useEffect(() => {
    void retry();
  }, [retry]);
  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      // Defer storage work outside the auth callback's lock.
      setTimeout(() => {
        if ((session?.user.id ?? guestId.current) !== current.current.id)
          void retry();
      }, 0);
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, [retry]);
  useEffect(() => {
    if (ready) void sync();
  }, [ready, sync]);
  useEffect(() => {
    if (ready && !syncing && !error && data.pending.length > 0) void sync();
  }, [ready, syncing, error, data.pending.length, sync]);
  useEffect(() => {
    if (supabase) supabase.auth.startAutoRefresh();
    const timer = setInterval(() => setToday(localDate()), 15000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase?.auth.startAutoRefresh();
        setToday(localDate());
        void sync();
      } else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, [sync]);
  return (
    <Context.Provider
      value={{
        id,
        user,
        data,
        ready,
        error,
        syncing,
        today,
        stats: progress(data.events, today),
        save,
        retry,
        sync,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePlayer() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing PlayerProvider.");
  return value;
}
