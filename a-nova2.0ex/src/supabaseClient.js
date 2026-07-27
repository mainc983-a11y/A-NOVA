import { createClient } from "@supabase/supabase-js";

// Safe env retrieval for browser and Node runtime without triggering CJS import.meta parser warnings
function getEnvVar(name) {
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  try {
    const metaEnv = new Function("try { return import.meta.env; } catch(e) { return null; }")();
    if (metaEnv && metaEnv[name]) {
      return metaEnv[name];
    }
  } catch (e) {}
  return "";
}

const rawUrl =
  getEnvVar("VITE_SUPABASE_URL") ||
  getEnvVar("SUPABASE_URL") ||
  "";

const rawKey =
  getEnvVar("VITE_SUPABASE_ANON_KEY") ||
  getEnvVar("SUPABASE_ANON_KEY") ||
  "";

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl !== "https://hzuvirpzwlflxjuddjnr.supabase.co" &&
  !rawUrl.includes("placeholder") &&
  rawKey !== "sb_publishable_dummy_key" &&
  typeof rawKey === "string" &&
  (rawKey.startsWith("ey") || rawKey.startsWith("sb_publishable_") || rawKey.startsWith("sbp_"))
);

export const SUPABASE_URL = (
  rawUrl || "https://placeholder.supabase.co"
).trim().replace(/\/rest\/v1\/?$/, "");

export const SUPABASE_ANON_KEY = (
  rawKey || "sb_publishable_dummy_key"
).trim();

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




