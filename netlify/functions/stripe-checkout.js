// POST /.netlify/functions/stripe-checkout
// Creates a Stripe Checkout session for the Tax Pass. Requires Supabase JWT.
// No-ops with 503 until STRIPE_SECRET_KEY + STRIPE_PRICE_TAX_PASS are set —
// the client then falls back to a clearly-labeled simulated unlock (demo).
//
// GUARDRAIL: this is the ONE permitted use of Stripe at MVP — it gates tax
// exports. It never touches HSA funds and never processes goods payments.
//
// ⚠️ PRODUCTION TODO (before real payments): entitlement must be granted by a
// Stripe webhook (checkout.session.completed) with server-side verification —
// not by the client after redirect, which is the demo-grade shortcut used now.

import { requireUser, json } from "./_shared.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_TAX_PASS) {
    return json(503, { error: "Payments aren't enabled on this deploy yet." });
  }

  const auth = await requireUser(event);
  if (!auth) return json(401, { error: "Sign in required." });

  const origin = event.headers.origin || "https://candorhsa.com";
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": process.env.STRIPE_PRICE_TAX_PASS,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/tax?upgraded=1`,
    cancel_url: `${origin}/tax`,
    client_reference_id: auth.user.id,
  });

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `Stripe error (${res.status})`);
    return json(200, { url: data.url });
  } catch (err) {
    console.error("stripe-checkout failed:", err.message);
    return json(502, { error: "Couldn't start checkout. Try again shortly." });
  }
}
