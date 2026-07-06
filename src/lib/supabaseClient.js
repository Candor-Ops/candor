// Supabase browser client (Week 2).
//
// Uses ONLY the public anon key — safe to expose client-side because every
// user-data table is protected by row-level security (see supabase/migrations).
// The service_role key must NEVER appear in client code, VITE_* vars, or the repo.
//
// Gracefully degrades: if env vars aren't set yet (e.g. a fresh clone or a
// Netlify deploy before the vars exist), `supabase` is null and the app renders
// signed-out instead of crashing. Check `isSupabaseConfigured` before use.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

export default supabase;
