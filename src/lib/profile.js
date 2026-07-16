// User profile helper (Week 2) — currently just the HSA establishment date.
// RLS scopes all queries to the signed-in user (one row per user).

import * as Sentry from "@sentry/react";
import { supabase } from "./supabaseClient.js";

/** Returns the profile row (snake_case) or null if none exists yet. */
export async function loadProfile() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) {
    Sentry.captureException(error);
    console.error("[profile] load failed:", error);
    return null;
  }
  return data;
}

/**
 * Upserts the HSA establishment date ("YYYY-MM-DD" or null to clear).
 * Throws on failure so callers can show an error state.
 */
export async function saveHsaDate(userId, date) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      user_id: userId,
      hsa_established_date: date || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
