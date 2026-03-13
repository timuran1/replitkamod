import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NOTE: The two Supabase secrets were entered in swapped order in Replit Secrets,
// so we detect and correct this automatically.
function resolveSupabaseVars(): { url: string; anonKey: string } {
  const a = (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string)?.trim() ?? "";
  const b = (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string)?.trim() ?? "";

  // URL must start with https://, key must start with eyJ (JWT)
  if (a.startsWith("https://")) return { url: a, anonKey: b };
  if (b.startsWith("https://")) return { url: b, anonKey: a };

  return { url: "", anonKey: "" };
}

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabaseVars();

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Supabase] Env vars missing or invalid — auth disabled.");
    return null;
  }

  try {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    console.log("[Supabase] Client initialised:", supabaseUrl.slice(0, 30));
    return _client;
  } catch (err) {
    console.error("[Supabase] Failed to create client:", err);
    return null;
  }
}

export const supabase = getSupabase();
