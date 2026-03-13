import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const url = supabaseUrl?.trim();
  const key = supabaseAnonKey?.trim();

  if (!url || !key || !url.startsWith("http")) {
    console.warn("[Supabase] Env vars missing or invalid — auth disabled. URL:", url ? `${url.slice(0, 20)}…` : "EMPTY");
    return null;
  }

  try {
    _client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return _client;
  } catch (err) {
    console.error("[Supabase] Failed to create client:", err);
    return null;
  }
}

export const supabase = getSupabase();
