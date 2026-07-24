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
  rawUrl || "https://hzuvirpzwlflxjuddjnr.supabase.co"
).trim().replace(/\/rest\/v1\/?$/, "");

export const SUPABASE_ANON_KEY = (
  rawKey || "sb_publishable_dummy_key"
).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured
  }
});



