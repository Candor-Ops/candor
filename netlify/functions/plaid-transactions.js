// POST /.netlify/functions/plaid-transactions
// Pulls transaction history for all of the caller's linked Plaid items via
// /transactions/sync, plus current account balances. Requires Supabase JWT.
//
// Demo-grade: no cursor persistence — each call replays full history. Fine
// for sandbox volumes; persist cursors per item before production.

import { plaid, requireUser, json, configMissing } from "./_shared.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const missing = configMissing();
  if (missing) return missing;

  const auth = await requireUser(event);
  if (!auth) return json(401, { error: "Sign in required." });

  try {
    const { data: items, error } = await auth.supabase
      .from("plaid_items")
      .select("item_id, access_token, institution_name");
    if (error) throw error;
    if (!items?.length) return json(200, { transactions: [], accounts: [], items: 0 });

    const transactions = [];
    const accounts = [];

    for (const item of items) {
      let cursor = undefined;
      let hasMore = true;
      let guard = 0;
      while (hasMore && guard < 20) {
        guard++;
        const res = await plaid("/transactions/sync", {
          access_token: item.access_token,
          count: 500,
          ...(cursor ? { cursor } : {}),
        });
        for (const t of res.added ?? []) {
          transactions.push({
            date: t.date,
            description: t.merchant_name || t.name || "",
            amount: t.amount, // Plaid: positive = money out
            plaidCategory: t.personal_finance_category?.primary || null,
            institution: item.institution_name,
            pending: Boolean(t.pending),
          });
        }
        cursor = res.next_cursor;
        hasMore = Boolean(res.has_more);
      }

      const bal = await plaid("/accounts/balance/get", {
        access_token: item.access_token,
      });
      for (const a of bal.accounts ?? []) {
        accounts.push({
          name: a.name,
          mask: a.mask,
          type: a.type,
          subtype: a.subtype,
          available: a.balances?.available ?? null,
          current: a.balances?.current ?? null,
          institution: item.institution_name,
        });
      }
    }

    return json(200, { transactions, accounts, items: items.length });
  } catch (err) {
    console.error("transactions failed:", err.plaid || err.message);
    return json(502, { error: "Couldn't fetch transactions. Try again shortly." });
  }
}
