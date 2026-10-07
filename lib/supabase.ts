import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_STORAGE_KEY } from "./session";
import { createClient } from "@supabase/supabase-js";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        global: {
          fetch: async (input, init) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            try {
              return await fetch(input, { ...init, signal: controller.signal });
            } finally {
              clearTimeout(timer);
            }
          },
        },
        auth: {
          storageKey: AUTH_STORAGE_KEY,
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
