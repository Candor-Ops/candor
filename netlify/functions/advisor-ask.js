// POST /.netlify/functions/advisor-ask   body: { question }
// LLM fallback for the eligibility advisor — GROUNDED in the rules engine.
//
// Guardrails (PRD Feature 5): the model answers ONLY from the rules database
// digest it's given. It must cite matching entries, say so when the database
// doesn't cover something, and never invent eligibility claims. Requires
// sign-in (Supabase JWT) to keep API costs bounded.
// No-ops with 503 if ANTHROPIC_API_KEY isn't configured.

import { requireUser, json } from "./_shared.js";
import { RULES, RULES_VERSION } from "../../src/data/eligibilityRules.js";

const MODEL = "claude-haiku-4-5";

const digest = RULES.map(
  (r) =>
    `${r.slug} | ${r.name} | bucket ${r.bucket} | ${r.citation} | ${r.summary}${r.caveats ? " CAVEAT: " + r.caveats : ""}`
).join("\n");

const SYSTEM = `You are Candor's HSA eligibility advisor. You answer ONLY from the rules database below (version ${RULES_VERSION}). Buckets: A = directly HSA-eligible; B = eligible only with a Letter of Medical Necessity; C = not eligible.

Hard rules:
- Ground every claim in database entries. Cite entries by listing their slugs on the final line as: SLUGS: slug1, slug2
- If the database doesn't cover the question, say plainly that it isn't in Candor's database yet and recommend consulting IRS Pub. 502 or a tax professional. Do NOT guess eligibility.
- Gym/fitness/wellness is never directly eligible; DPC caps are a cliff; telehealth pre-deductible is permanent (OBBB §71306).
- Keep answers under 120 words, plain English, warm but precise.
- Always end with: "Not tax advice."

DATABASE:
${digest}`;

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(503, { error: "The free-form advisor isn't enabled on this deploy yet." });
  }

  const auth = await requireUser(event);
  if (!auth) return json(401, { error: "Sign in to ask free-form questions." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const question = String(body.question || "").slice(0, 500).trim();
  if (!question) return json(400, { error: "question required." });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: question }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `LLM error (${res.status})`);

    let answer = (data.content?.[0]?.text || "").trim();
    let matchedSlugs = [];
    const slugLine = answer.match(/\nSLUGS:\s*(.+)\s*$/i);
    if (slugLine) {
      matchedSlugs = slugLine[1]
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter((s) => RULES.some((r) => r.slug === s));
      answer = answer.replace(/\nSLUGS:.*$/i, "").trim();
    }
    return json(200, { answer, matchedSlugs, model: MODEL, rulesVersion: RULES_VERSION });
  } catch (err) {
    console.error("advisor-ask failed:", err.message);
    return json(502, { error: "The advisor hit a snag — try again shortly." });
  }
}
