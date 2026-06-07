import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tfxcmonwlyreferjypla.supabase.co/rest/v1/";
const SUPARBASE_PUBLIC_KEY = "sb_publishable_64ftAdHTVTc037hDjUbaYg_wp5tOKFi";

// Dynamic extractor to resolve base URL so Supabase libraries won't append wrong auth endpoints
const baseSupabaseUrl = SUPABASE_URL.trim().replace(/\/rest\/v1\/?$/, "");

export const supabase = createClient(baseSupabaseUrl, SUPARBASE_PUBLIC_KEY);

