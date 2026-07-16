// POST /.netlify/functions/plaid-create-link-token
// Creates a Plaid Link token for the signed-in user. Requires Supabase JWT.

import { plaid, requireUser, json, configMissing } from "./_shared.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const missing = configMissing();
  if (missing) return missing;

  const auth = await requireUser(event);
  if (!auth) return json(401, { error: "Sign in required." });

  try {
    const res = await plaid("/link/token/create", {
      client_name: "Candor",
      language: "en",
      country_codes: ["US"],
      products: ["transactions"],
      user: { client_user_id: auth.user.id },
      transactions: { days_requested: 730 }, // 24-month backfill (PRD Feature 1)
    });
    return json(200, { link_token: res.link_token });
  } catch (err) {
    console.error("create-link-token failed:", err.plaid || err.message);
    return json(502, { error: "Couldn't start Plaid Link. Try again shortly." });
  }
}
