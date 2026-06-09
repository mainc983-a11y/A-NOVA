import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hzuvirpzwlflxjuddjnr.supabase.co";

const SUPABASE_PUBLIC_KEY = "sb_publishable_nSpXT2pPiiQCLKisCh60mw_6YBSr4cX";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
