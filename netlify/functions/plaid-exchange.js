// POST /.netlify/functions/plaid-exchange   body: { public_token, institution }
// Exchanges a Link public_token for an access_token and stores it in
// plaid_items (RLS-scoped to the caller). Requires Supabase JWT.

import { plaid, requireUser, json, configMissing } from "./_shared.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const missing = configMissing();
  if (missing) return missing;

  const auth = await requireUser(event);
  if (!auth) return json(401, { error: "Sign in required." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  if (!body.public_token) return json(400, { error: "public_token required." });

  try {
    const res = await plaid("/item/public_token/exchange", {
      public_token: body.public_token,
    });

    const { error } = await auth.supabase.from("plaid_items").upsert({
      item_id: res.item_id,
      user_id: auth.user.id,
      access_token: res.access_token,
      institution_name: body.institution || null,
    });
    if (error) throw error;

    return json(200, { ok: true, institution: body.institution || null });
  } catch (err) {
    console.error("exchange failed:", err.plaid || err.message);
    return json(502, { error: "Couldn't link the account. Try again shortly." });
  }
}
