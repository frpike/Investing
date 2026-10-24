// Supabase is optional at runtime: without these variables the app runs in guest mode only.
export const SUPABASE_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim().replace(/^["']|["']$/g, "");
export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** A Supabase API URL looks like https://<project>.supabase.co (or a custom domain), with no path. */
export const supabaseUrlLooksWrong = () => !!SUPABASE_URL && !/^https:\/\/[^/]+\/?$/.test(SUPABASE_URL.trim());

/** Accepts the Project URL as pasted from the dashboard, including the Data API form ending /rest/v1/. */
export function normalizeSupabaseUrl(raw: string) {
  return raw.trim().replace(/^["']|["']$/g, "").replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}
