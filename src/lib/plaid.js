// Client-side Plaid helpers (Week 3, sandbox).
// All Plaid secrets live server-side (Netlify Functions); the browser only
// ever sees short-lived link tokens and its own transaction data.

import { supabase } from "./supabaseClient.js";

const LINK_SCRIPT = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
let linkScriptPromise = null;

/** Loads Plaid Link's script once; resolves to window.Plaid. */
export function loadPlaidLink() {
  if (window.Plaid) return Promise.resolve(window.Plaid);
  if (!linkScriptPromise) {
    linkScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = LINK_SCRIPT;
      s.onload = () => resolve(window.Plaid);
      s.onerror = () => {
        linkScriptPromise = null;
        reject(new Error("Couldn't load Plaid Link."));
      };
      document.head.appendChild(s);
    });
  }
  return linkScriptPromise;
}

async function authedPost(fn, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in required.");
  const res = await fetch(`/.netlify/functions/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status}).`);
  return json;
}

export const createLinkToken = () => authedPost("plaid-create-link-token");
export const exchangePublicToken = (public_token, institution) =>
  authedPost("plaid-exchange", { public_token, institution });
export const fetchPlaidTransactions = () => authedPost("plaid-transactions");

/**
 * Full connect flow: open Plaid Link, exchange the token, return institution.
 * Resolves null if the user closes Link without connecting.
 */
export async function connectBank() {
  const [Plaid, { link_token }] = await Promise.all([
    loadPlaidLink(),
    createLinkToken(),
  ]);
  return new Promise((resolve, reject) => {
    const handler = Plaid.create({
      token: link_token,
      onSuccess: async (public_token, metadata) => {
        try {
          const institution = metadata?.institution?.name || null;
          await exchangePublicToken(public_token, institution);
          resolve({ institution });
        } catch (err) {
          reject(err);
        }
      },
      onExit: (err) => (err ? reject(new Error(err.display_message || "Link exited with an error.")) : resolve(null)),
    });
    handler.open();
  });
}
