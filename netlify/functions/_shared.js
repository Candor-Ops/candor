// Shared helpers for Candor's Netlify Functions (Plaid integration).
//
// SECRETS: PLAID_CLIENT_ID / PLAID_SECRET live only in Netlify env vars
// (server-side — NOT VITE_-prefixed, never in the client bundle).
//
// AUTH MODEL: every function requires the caller's Supabase JWT. We build a
// Supabase client bound to that JWT, so all DB access is RLS-scoped to the
// calling user — no service_role key anywhere in this codebase.

import { createClient } from "@supabase/supabase-js";

const PLAID_HOSTS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

export function plaidHost() {
  return PLAID_HOSTS[process.env.PLAID_ENV || "sandbox"];
}

/** POST to a Plaid endpoint with credentials injected. Throws on error. */
export async function plaid(path, body = {}) {
  const res = await fetch(`${plaidHost()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.error_message || `Plaid error (${res.status})`);
    err.plaid = { code: json?.error_code, type: json?.error_type };
    throw err;
  }
  return json;
}

/**
 * Validates the caller's Supabase JWT. Returns { user, supabase } where
 * `supabase` is RLS-scoped to that user, or null if unauthenticated.
 */
export async function requireUser(event) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { user: data.user, supabase };
}

export function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function configMissing() {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return json(503, {
      error:
        "Plaid isn't configured on this deploy (PLAID_CLIENT_ID / PLAID_SECRET env vars missing).",
    });
  }
  return null;
}
