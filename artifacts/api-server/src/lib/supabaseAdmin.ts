import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Secrets were stored in swapped order — detect and correct automatically.
function resolveSupabaseVars(): { url: string; serviceKey: string } {
  const a = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const b = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  // URL must start with https://, service key is a JWT (eyJ...)
  if (a.startsWith("https://")) return { url: a, serviceKey: b };
  // If anon key also got swapped into URL slot, try the other var
  const c = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (c.startsWith("https://")) return { url: c, serviceKey: b };
  if (b.startsWith("https://")) return { url: b, serviceKey: a };

  return { url: a, serviceKey: b };
}

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const { url, serviceKey } = resolveSupabaseVars();

  if (!url || !serviceKey) {
    throw new Error(`Supabase admin env vars missing or invalid. URL=${url ? url.slice(0, 20) : "MISSING"}`);
  }

  _client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[Supabase Admin] Client initialised:", url.slice(0, 30));
  return _client;
}
