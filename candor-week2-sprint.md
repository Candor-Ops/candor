# Candor — Week 2 MVP Build Sprint (handoff)

**Accounts + Persistence · Supabase Auth · Row-Level Security · Drop-in storage adapter**
Domain: **candorhsa.com** · Prepared for: incoming build agent · Written: July 2026

> This is the Week 2 handoff, written by the agent that completed and verified Week 1. Week 1 (pipeline, storefront, receipt vault, waitlist, custom domain, Sentry) is **live and verified on candorhsa.com**. Week 2's job is to add real accounts and move persistence off the browser: Supabase Auth, protected routes, a `receipts` table with row-level security, and a Supabase storage adapter that drops into the existing `<ReceiptVault />` with zero component changes. The guardrails and regulatory facts from Week 1 are unchanged and remain non-negotiable — they are restated in §2.

---

## 0 — Read this first

**Do not rebuild Week 1.** The storefront, vault UI, catalog, landing page, Layout, Sentry config, and all pipeline/config are delivered, deployed, and verified. Week 2 is additive: you are wiring a backend under components that already work. The single most important design fact: `<ReceiptVault />` persists through a two-method **storage adapter** (`load`/`save`). You are writing a Supabase adapter with the *same interface* and swapping it in. The component does not change.

**The one thing that must not go wrong: row-level security.** This is the first time Candor stores one user's data where another user could theoretically read it. RLS is mandatory, default-deny, and must be *tested* (User A cannot see User B's receipts). Everything else in Week 2 is plumbing; this is the part that matters.

---

## 1 — Current state (verified end of Week 1)

Everything below is confirmed live, not assumed.

### Repository & hosting
- **GitHub:** `github.com/Candor-Ops/candor`, branch `main`, HEAD at commit `e446001`. Auto-deploys to Netlify on push.
- **Netlify project:** `sensational-marzipan-ecccc4` (team slug `ornate-marshmallow-9b7692`). Build `npm run build`, publish `dist`. `netlify.toml` has the SPA redirect + security headers. Auto-deploy on push to `main` is confirmed working.
- **Live site:** `https://candorhsa.com` (primary domain, valid HTTPS). Also on `*.netlify.app`.
- **Netlify plan is Free** — this matters: environment-variable **"specific scopes" are locked** (upgrade-gated). Create all env vars with **All scopes**. (This bit us in Week 1: connector-set vars with a "builds" scope silently failed to persist.)

### Stack
- Vite 6 + React 18, React Router v7, Tailwind v4 (no config file; brand colors are `@theme` tokens in `src/index.css`; use the `.font-display` utility). `@sentry/react` for monitoring.

### Environment variables currently set in Netlify (All scopes unless noted)
| Variable | Purpose |
|---|---|
| `VITE_WEB3FORMS_KEY` | Landing waitlist (Web3Forms) |
| `VITE_SENTRY_DSN` | Sentry browser SDK (public, safe) |
| `VITE_SENTRY_ENVIRONMENT` | `production` |
| `SENTRY_ORG` | `candor-x9` (build-time, source-map upload) |
| `SENTRY_PROJECT` | `javascript-react` (build-time) |
| `SENTRY_AUTH_TOKEN` | **secret** — org token, build-time source-map upload |

You will **add** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Week 2 (§3). `.env.example` in the repo documents variable names; `.env.local` (gitignored) holds dev values.

### Monitoring
- Sentry: org `candor-x9`, project `javascript-react`. Source maps upload on build and are **not** served publicly (`vite.config.js` deletes them after upload). Config in `src/instrument.js` is **privacy-first** (errors-only replay, `maskAllText`/`blockAllMedia`/`maskAllInputs`, `beforeSend` strips query strings, no-ops without DSN). App is wrapped in `Sentry.ErrorBoundary` in `main.jsx`. **Week 2 adds user context** — see §7.

### DNS / email (do not disturb)
- `candorhsa.com` uses **Netlify DNS** (nameservers `dns1–dns4.p03.nsone.net`). Zone records: apex + `www` → the Netlify site; **MX** `@ 1 smtp.google.com`; **TXT/SPF** `v=spf1 include:_spf.google.com ~all` (Google Workspace mail, restored in Week 1). **Outstanding:** DKIM (`google._domainkey` TXT from Google Admin) and DMARC (`_dmarc` TXT) are not yet added — deliverability follow-ups, not blockers.
- ⚠️ Supabase Auth sends email (confirmations, magic links). If you configure a custom email domain later, do it without breaking the existing MX/SPF. For Week 2, use Supabase's default email sender.

### The storage-adapter contract (the crux of Week 2)
`src/lib/localStorageAdapter.js` implements exactly two async methods:

```js
load(userId)        -> Promise<Receipt[]>   // newest-first is fine; the vault re-sorts
save(userId, list)  -> Promise<void>        // persists the WHOLE list (bulk overwrite)
```

`<ReceiptVault storageAdapter={...} userId={...} />` is mounted in `src/pages/Vault.jsx` with `userId="demo-user"`. On mount it calls `load(userId)`; on every change it calls `save(userId, receipts)` with the entire array. Your Supabase adapter implements the same two methods (§6). **Note the bulk-overwrite pattern** — it's fine for localStorage but naïve against a database; §6 explains how to reconcile safely.

### Receipt object shape (source of the table schema)
```
id           string   e.g. "r_1718900000000"
product      string   required
merchant     string
date         string   "YYYY-MM-DD"
subtotal     number
tax          number
total        number
category     enum: OTC|Vision|Dental|Diagnostics|First Aid|Family|DPC|Telehealth|Recovery|Other
paySource    "out-of-pocket" | "hsa-card"
cardBrand    string   (Visa|Mastercard|Amex|Discover|HSA debit|Other)
cardLast4    string   last 4 digits ONLY — never full PAN/expiry/CVV
hsaOpenAtTime boolean
notes        string
photo        string   small downscaled JPEG data URL (see §5 — becomes Storage in Week 2)
status       "deferred" | "reimbursed" | "paid-from-hsa"
createdAt    ISO string
```

### Routes (all under shared `Layout`, none protected yet)
`/` Landing · `/store` Store · `/vault` Vault · `/dashboard` (Week 3 placeholder) · `/tax` (Week 3 placeholder) · `/account` (Week 2 placeholder — you build this) · `*` → Landing.

---

## 2 — Hard guardrails (unchanged, non-negotiable)

Carried verbatim from Week 1 `CLAUDE.md`. The delivered code complies; keep it that way.

- **Demo-grade MVP.** No real card processing, no real HSA fund movement, no production-grade PII storage. Supabase Auth (managed email/password + magic link) is acceptable and is *not* "production PII infrastructure" — but do not start storing sensitive health/financial data beyond what the vault already holds.
- **Receipts store card brand + last 4 only.** Never full card number, expiry, or CVV. Already enforced in the capture form; keep it enforced in the schema (no column for full PAN).
- **No ads. Never sell or share user data.** Reflect in copy.
- **Regulatory copy is load-bearing and accurate:** DPC cliff (>$150/mo self / >$300/mo family disqualifies the whole month; employer-paid doesn't qualify), pre-deductible telehealth permanent (OBBB §71306), gym/fitness **not** broadly eligible (LMN only), no expiration on reimbursement (Notice 2004-50 Q&A 39). Don't touch these strings without care.
- **All regulatory/eligibility copy needs counsel review before public launch.** Still pending.

### Week 2-specific guardrails (new)
- **RLS is mandatory and default-deny.** Enable it on every user-data table *before* inserting real data, and write explicit policies. Forgetting = data leak.
- **The `anon` key is public and client-safe** — it belongs in `VITE_SUPABASE_ANON_KEY`. The **`service_role` key is a god-mode secret**: never put it in client code, `VITE_*` vars, the repo, or chat. It is not needed for Week 2 at all.
- **Sentry user context is the opaque user UUID only** — never email or any PII (§7). This preserves the privacy posture that is part of the product.
- **Don't over-build.** No custom SMTP, no social logins, no org/team accounts. Email/password + magic link, protected routes, RLS, drop-in adapter. That's the sprint.

---

## 3 — Part A: Supabase project + client wiring

**A1 — Create the project.** In Supabase, create a project (region near your users). Copy the **Project URL** and the **`anon` public key** from Project Settings → API. (Ignore the `service_role` key — you won't use it.)

**A2 — Env vars.** Add to `.env.local` (dev) and Netlify (prod, **All scopes**):
| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | client (dev + Netlify) | Project URL |
| `VITE_SUPABASE_ANON_KEY` | client (dev + Netlify) | Public anon key — safe to expose |

Update `.env.example` with the two names (no values). Redeploy is needed for Netlify to bake `VITE_*` vars into the client bundle (Vite inlines them at build time — a running deploy won't pick up new env vars until it rebuilds).

**A3 — Client.** `npm install @supabase/supabase-js`. Create `src/lib/supabaseClient.js`:
```js
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**A4 — Auth redirect allowlist.** In Supabase → Authentication → URL Configuration, set **Site URL** to `https://candorhsa.com` and add redirect allow-list entries for `https://candorhsa.com/**` and `http://localhost:5173/**` (Vite dev). Magic links and email confirmations break if the redirect URL isn't allow-listed — this is the most common Week 2 footgun.

✅ `supabase` client imports cleanly · env vars set in both places · redirect URLs allow-listed.

---

## 4 — Part B: Auth + protected routes

**B1 — Session provider.** Create an auth context (e.g. `src/lib/AuthContext.jsx`) exposing `{ session, user, loading }` plus `signInWithPassword`, `signUp`, `signInWithMagicLink`, `signOut`. Initialize from `supabase.auth.getSession()` and subscribe to `supabase.auth.onAuthStateChange`. Wrap `<App />` (inside the existing `Sentry.ErrorBoundary`/`BrowserRouter`) with the provider.

**B2 — Account page.** Replace the `/account` placeholder (`src/pages/Account.jsx`) with the real auth surface: signed-out shows sign-in / sign-up / "email me a magic link"; signed-in shows the account email and a **Sign out** button. Match the brand (`.font-display`, `candor-gradient`, `rounded-xl` inputs/buttons, stone ink).

**B3 — Protected routes.** Add a `RequireAuth` wrapper that redirects to `/account` when there's no session. Protect **`/vault`** (and `/dashboard`, `/tax`, `/account` self-manages). **Leave `/` and `/store` public** — the storefront and waitlist are the top-of-funnel and must stay open. While `loading`, render a neutral splash (don't flash the login screen).

**B4 — Nav reflects auth state.** In `Layout`, show "Sign in" when signed out and an account affordance + "Sign out" when signed in. Keep the mobile bottom tab bar working.

✅ Sign up + sign in (password) works · magic-link sign-in works end-to-end on candorhsa.com · `/vault` redirects to `/account` when signed out · signed-in nav + sign-out work · no "flash of login" during session load.

---

## 5 — Part C: Database schema + RLS

**C1 — `receipts` table.** Create a table mapping the receipt shape from §1. Suggested columns:

```sql
create table public.receipts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  product       text not null,
  merchant      text,
  date          date,
  subtotal      numeric,
  tax           numeric,
  total         numeric,
  category      text,
  pay_source    text check (pay_source in ('out-of-pocket','hsa-card')),
  card_brand    text,
  card_last4    text check (card_last4 ~ '^[0-9]{0,4}$'),  -- last 4 only, enforced
  hsa_open_at_time boolean default true,
  notes         text,
  photo_path    text,            -- Storage object path, NOT a data URL (see C3)
  status        text check (status in ('deferred','reimbursed','paid-from-hsa')),
  created_at    timestamptz default now()
);
```
The client's `id`/`createdAt` can map to DB `id`/`created_at`; camelCase↔snake_case mapping lives in the adapter (§6). The `card_last4` check constraint is a second line of defense on the last-4 guardrail.

**C2 — Enable RLS + policies.** This is the critical part.
```sql
alter table public.receipts enable row level security;

create policy "own receipts – select" on public.receipts
  for select using (auth.uid() = user_id);
create policy "own receipts – insert" on public.receipts
  for insert with check (auth.uid() = user_id);
create policy "own receipts – update" on public.receipts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own receipts – delete" on public.receipts
  for delete using (auth.uid() = user_id);
```
Default `user_id` to `auth.uid()` on insert if you prefer, but always keep the `with check`.

**C3 — Receipt photos.** Today the photo is a downscaled JPEG **data URL** stored inline (see `downscaleImage`, max-dim 700, quality 0.6 — keep that client-side downscaling; it's a guardrail). Storing large data URLs in a Postgres text column is a bad idea. Create a **private Supabase Storage bucket** (`receipt-photos`) with RLS so a user can only read/write objects under their own `user_id/` prefix; store the object **path** in `receipts.photo_path`. Generate signed URLs for display. (Acceptable shortcut for a pure demo: keep the small thumbnail inline in a text column — but note the tradeoff and prefer Storage.)

✅ Table created · RLS **enabled** · four policies present · Storage bucket private with per-user RLS.

---

## 6 — Part D: Supabase storage adapter (drop-in)

Create `src/lib/supabaseAdapter.js` implementing the **same contract** as `localStorageAdapter`:

- **`load(userId)`** → `select * from receipts` (RLS scopes it to the caller automatically; you don't filter by `userId` manually, but it's passed for parity). Map DB rows → the camelCase receipt shape the component expects.
- **`save(userId, list)`** → the component hands you the *entire* array on every change. Reconcile rather than blindly overwrite: **upsert** all rows in `list` (on `id`), and **delete** any DB rows for this user whose `id` is no longer in `list`. Do it in the fewest round-trips you can. Wrapping the create/update/delete of a single receipt as a whole-list save is inefficient but preserves the drop-in interface for Week 2; note it as tech debt.

> Optional cleaner refactor (only if time allows): give `<ReceiptVault />` optional per-row callbacks (`onAdd`/`onUpdate`/`onRemove`) so the adapter can do targeted writes instead of full-list reconciliation. If you do this, keep `load`/`save` working so localStorage still functions as a fallback. Don't let this balloon the sprint.

**Swap it in** — `src/pages/Vault.jsx`:
```jsx
// before: <ReceiptVault storageAdapter={localStorageAdapter} userId="demo-user" />
<ReceiptVault storageAdapter={supabaseAdapter} userId={user.id} />
```
`user.id` comes from the session (§4). Keep `localStorageAdapter` in the repo — it's still the reference implementation and a useful offline fallback.

**Migration of existing demo data:** none required. The `demo-user` localStorage receipts are throwaway demo data and don't need importing. (Optional nicety: a one-time "import my local receipts" button. Not in scope.)

✅ Adding a receipt writes a row to Supabase (visible in the table editor) · reload/other browser shows the same receipts (persistence is now server-side, not per-browser) · mark-reimbursed/undo/delete round-trip correctly.

---

## 7 — Part E: Sentry user context

After sign-in, attach the **opaque user id only** so errors are attributable without leaking PII:
```js
import * as Sentry from "@sentry/react";
Sentry.setUser({ id: session.user.id });   // UUID only — NOT email, NOT name
// on sign-out:
Sentry.setUser(null);
```
Do this from the auth state-change handler. Do **not** add email or any identifying trait — the privacy posture (masked replays, scrubbed PII) is part of the product and the Week 1 config depends on it.

✅ A test error while signed in shows the user UUID in Sentry · signing out clears it · no email/PII appears in any event.

---

## 8 — Done-when (Week 2 acceptance)

> **Done when:** a stranger can sign up on candorhsa.com, log in (password **or** magic link), add receipts that persist server-side across devices, and — critically — **cannot see anyone else's receipts**. Signing out protects `/vault`.

The falsifiable security test (do this explicitly):
1. Sign up as **User A**, add 2 receipts.
2. Sign up as **User B** in a different browser/incognito. Confirm B's vault is empty and B **cannot** load A's receipts.
3. Bonus: with an anonymous Supabase client (no session), attempt `select * from receipts` and confirm RLS returns **zero rows**.

If step 2 or 3 leaks data, RLS is misconfigured — stop and fix before anything else.

---

## 9 — Master checklist

**Setup**
- [ ] Supabase project created; `anon` key + URL copied (`service_role` untouched)
- [ ] `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local` and Netlify (**All scopes**); `.env.example` updated
- [ ] `@supabase/supabase-js` installed; `supabaseClient.js` created
- [ ] Auth redirect URLs allow-listed (candorhsa.com + localhost); Site URL set

**Auth**
- [ ] Session provider wraps the app; `useSession`/context available
- [ ] `/account` rebuilt: sign up / sign in / magic link / sign out
- [ ] `RequireAuth` protects `/vault`; `/` and `/store` stay public
- [ ] Nav reflects auth state; no login flash during load

**Data + RLS**
- [ ] `receipts` table created (last-4 constraint in place)
- [ ] **RLS enabled** + select/insert/update/delete policies scoped to `auth.uid()`
- [ ] Private `receipt-photos` Storage bucket with per-user RLS; `photo_path` used
- [ ] **RLS proven**: User B cannot read User A's rows; anon read returns 0 rows

**Adapter + persistence**
- [ ] `supabaseAdapter.js` implements `load`/`save` (reconcile, don't clobber)
- [ ] `Vault.jsx` uses `supabaseAdapter` + `user.id`
- [ ] Receipts persist server-side across browsers; CRUD round-trips

**Monitoring**
- [ ] `Sentry.setUser({ id })` on login (UUID only), cleared on logout; no PII

**Ship**
- [ ] Pushed to `main`; Netlify auto-deploy green; done-when test passes on candorhsa.com

---

## 10 — Risk callouts

1. **RLS default-deny is the whole game.** Enable RLS *before* real inserts and test cross-user isolation. This is the one Week 2 bug that's a security incident rather than a UI glitch.
2. **`service_role` key never touches the client or repo.** Only the `anon` key ships. If you ever think you need `service_role` client-side, you've taken a wrong turn.
3. **Netlify Free plan = All-scope env vars only.** "Specific scopes" is upgrade-gated; setting a build-only scope silently fails to persist (this cost real time in Week 1). Use All scopes.
4. **`VITE_*` vars are build-time.** Adding Supabase vars requires a redeploy to take effect; a running deploy won't see them.
5. **Auth redirect allow-list.** Magic links / confirmations fail unless `candorhsa.com` and `localhost` are allow-listed and Site URL is set. Test the magic-link flow on the *live* domain, not just localhost.
6. **Supabase free-tier email limits.** The default email sender is rate-limited — fine for demo, but don't loop on magic-link testing. Don't wire custom SMTP/domain email in Week 2 (and if you ever do, don't disturb the existing MX/SPF that fixes `accounts@candorhsa.com`).
7. **Whole-list `save()` is a race risk.** Two tabs editing in parallel can clobber. Acceptable for demo; note it, and prefer per-row writes if you refactor.
8. **Don't regress the vault's guardrails.** Card last-4 only (now double-enforced by a DB check), client-side photo downscaling, private photo storage. The schema must not add a full-PAN column.
9. **Demo-grade is still the ceiling.** Real accounts via managed Supabase Auth is fine; do not drift into building production identity/compliance infrastructure — that's a deliberate non-goal.

---

## 11 — What comes after Week 2 (context only — don't build here)

| Week | Theme | Scope |
|---|---|---|
| **Week 3** | Core loop end-to-end | Affiliate link-out + simulated checkout; receipt auto-file via the `prefill` prop on purchase; shoebox dashboard (`/dashboard`); tax export (`/tax`, Form 8889); **DPC cap tracker** (enforce the monthly cliff). |
| **Week 4** | Polish + demo-readiness | Privacy policy + trust copy (incl. Sentry + Supabase data handling); seeded demo account (12–15 months history); privacy-respecting analytics; error/loading/empty states; a11y basics; **counsel review of all regulatory copy before public launch**. |

Outstanding minor items inherited from Week 1 (nice-to-have, not blockers): add **DKIM** (`google._domainkey`) and **DMARC** (`_dmarc`) TXT records for mail deliverability; resolve/ignore the deliberate Sentry test error left in the dashboard.

---

*Candor · candorhsa.com · Confidential. Built for a 4-week MVP sprint. Regulatory statements are informational and require counsel review before public launch. Week 1 delivered and verified; Week 2 adds accounts + persistence with row-level security as the load-bearing requirement.*
