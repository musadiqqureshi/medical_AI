import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True once real credentials are in .env.local (not the placeholder text).
export const isSupabaseConfigured = Boolean(
  url && anonKey && url.startsWith("https://") && !url.includes("PASTE_"),
);

// Null until configured, so the app still runs before Supabase is set up.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
