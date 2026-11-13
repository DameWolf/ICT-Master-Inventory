import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const SUPABASE_TABLE = "inventory_items";
export const SUPABASE_SERVICE_REQUESTS_TABLE = "service_requests";

export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session || null;
}

export async function hasSupabaseAuthSession() {
  return Boolean(await getSupabaseSession());
}

export async function isSupabaseAdmin() {
  const session = await getSupabaseSession();
  const role = session?.user?.app_metadata?.role;
  return role === "admin";
}
