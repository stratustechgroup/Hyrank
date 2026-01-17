import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./types";

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Browser client (for client components)
export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client for development without Supabase
    console.warn("Supabase not configured. Auth features will be disabled.");
    return null;
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
