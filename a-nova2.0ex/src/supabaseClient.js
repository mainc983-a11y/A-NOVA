import { createClient } from "@supabase/supabase-js";

// Single source of truth helper to read environment variables
const getEnvVar = (key) => {
  if (typeof import.meta !== "undefined" && import.meta?.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process?.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
};

const rawUrl = getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL");
const rawKey = getEnvVar("VITE_SUPABASE_ANON_KEY") || getEnvVar("SUPABASE_ANON_KEY");

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl !== "https://hzuvirpzwlflxjuddjnr.supabase.co" &&
  !rawUrl.includes("placeholder") &&
  typeof rawKey === "string" &&
  rawKey.startsWith("ey")
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


