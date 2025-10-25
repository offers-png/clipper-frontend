import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safety: fail loudly if envs are missing (prevents weird 4xx later)
if (!url || !anonKey) {
  // Don't log keys—just the fact they’re missing
  // This throws during load so you see it immediately.
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, anonKey);
