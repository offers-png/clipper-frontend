// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import { supabaseConfigError } from "./supabaseConfig.mjs";

// These MUST match your Render env names
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// createClient throws on missing settings; StudioEntry shows the error instead.
export const configError = supabaseConfigError(import.meta.env);
if (configError) console.error(configError);

export const supabase = configError ? null : createClient(supabaseUrl, supabaseAnonKey);
