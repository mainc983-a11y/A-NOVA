import { createClient } from "@supabase/supabase-js";

// Safe env retrieval for browser and Node runtime without triggering CJS import.meta parser warnings
function getEnvVar(name) {
  if (name === "VITE_SUPABASE_URL") {
    return import.meta.env.VITE_SUPABASE_URL || "";
  }

  if (name === "VITE_SUPABASE_ANON_KEY") {
    return import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  }

  return "";
}

const rawUrl =
  getEnvVar("VITE_SUPABASE_URL") ||
  getEnvVar("SUPABASE_URL") ||
  getEnvVar("NEXT_PUBLIC_SUPABASE_URL") ||
  "";

const rawKey =
  getEnvVar("VITE_SUPABASE_ANON_KEY") ||
  getEnvVar("SUPABASE_ANON_KEY") ||
  getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
  getEnvVar("SUPABASE_KEY") ||
  "";

// Clean quotes and paths
const cleanUrl = (rawUrl || "")
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/+$/, "");

const cleanKey = (rawKey || "")
  .trim()
  .replace(/^["']|["']$/g, "");

console.log("[SUPABASE DEBUG]", {
  rawUrl,
  rawKeyExists: Boolean(rawKey),
  cleanUrl,
  cleanKeyExists: Boolean(cleanKey),
  isConfigured: Boolean(cleanUrl && cleanKey),
});

export const isSupabaseConfigured =
  Boolean(cleanUrl) &&
  Boolean(cleanKey) &&
  cleanUrl.startsWith("http") &&
  cleanKey.length > 15;

export const SUPABASE_URL = cleanUrl || "https://placeholder.supabase.co";
export const SUPABASE_ANON_KEY = cleanKey || "sb_publishable_dummy_key";

function createDummyQueryBuilder() {
  const dummyBuilder = new Proxy(
    function () {},
    {
      get(target, prop) {
        if (prop === "then") {
          return (resolve) => resolve({ data: [], error: null });
        }
        if (prop === "catch") {
          return (reject) => {};
        }
        return () => dummyBuilder;
      },
      apply() {
        return dummyBuilder;
      }
    }
  );
  return dummyBuilder;
}

function createDummySupabaseClient() {
  const dummyAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: new Error("Supabase is not configured") }),
    signUp: async () => ({ data: null, error: new Error("Supabase is not configured") }),
    signInWithOAuth: async () => ({ error: new Error("Supabase is not configured") }),
    signOut: async () => ({ error: null })
  };

  const dummyChannel = () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {},
    unsubscribe: () => {}
  });

  return new Proxy(
    {
      auth: dummyAuth,
      from: (_tableName) => createDummyQueryBuilder(),
      channel: (_name) => dummyChannel(),
      removeChannel: (_ch) => {}
    },
    {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        return () => createDummyQueryBuilder();
      }
    }
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : createDummySupabaseClient();




