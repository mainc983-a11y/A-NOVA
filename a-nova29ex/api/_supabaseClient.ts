import { createClient } from "@supabase/supabase-js";

// Safe env retrieval for browser and Node runtime
function getEnvVar(name: string): string {
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name] as string;
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

export const isSupabaseConfigured: boolean = Boolean(
  cleanUrl &&
  cleanKey &&
  cleanUrl.startsWith("http") &&
  !cleanUrl.includes("placeholder") &&
  cleanKey !== "sb_publishable_dummy_key" &&
  cleanKey.length > 15
);

export const SUPABASE_URL: string = cleanUrl || "https://placeholder.supabase.co";
export const SUPABASE_ANON_KEY: string = cleanKey || "sb_publishable_dummy_key";

function createDummyQueryBuilder(): any {
  const dummyBuilder: any = new Proxy(
    function () {},
    {
      get(target, prop) {
        if (prop === "then") {
          return (resolve: any) => resolve({ data: [], error: null });
        }
        if (prop === "catch") {
          return (reject: any) => {};
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

function createDummySupabaseClient(): any {
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
      from: (_tableName: string) => createDummyQueryBuilder(),
      channel: (_name: string) => dummyChannel(),
      removeChannel: (_ch: any) => {}
    },
    {
      get(target: any, prop: string) {
        if (prop in target) {
          return target[prop];
        }
        return () => createDummyQueryBuilder();
      }
    }
  );
}

export const supabase: any = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : createDummySupabaseClient();
