# Candor — project context

Candor is a verified HSA storefront (formerly ClearVault — NEVER use that
name in UI). Users buy pre-verified HSA-eligible products, receipts are
captured automatically, and they track an out-of-pocket "shoebox" balance
to reimburse from their HSA tax-free later (IRS Notice 2004-50 Q&A 39 —
no deadline on reimbursement). Live domain: candorhsa.com.

## Stack
- Vite + React, React Router v7, Tailwind v4 (no config file; brand colors
  are @theme tokens in src/index.css).
- Hosting: Netlify (auto-deploys from GitHub main).
- Error monitoring: Sentry (@sentry/react). Config in src/instrument.js,
  imported first in main.jsx. Privacy-first: session replay is masked and
  errors-only; no PII in events.
- Auth + DB (Week 2+): Supabase with row-level security.

## Status: Week 1 components are PRE-BUILT and delivered
- Landing, Store, Vault, EligBadge, ReceiptVault, catalog, Layout, icons,
  placeholders, and all config are already in the repo. Drop in, wire env
  vars, deploy. Do not regenerate them from scratch.

## Hard guardrails — never violate
- Demo-grade MVP. NO real card processing, NO real HSA fund movement,
  NO production-grade PII storage.
- Checkout is affiliate link-out + simulated direct only. NO live Stripe.
- No ads. Never sell user data. Reflect in all copy.
- Gym/fitness memberships are NOT broadly HSA-eligible — do not claim
  otherwise. LMN-required only.
- DPC cap is a cliff: >$150/mo self or >$300/mo family disqualifies the
  whole arrangement that month. Employer-paid DPC does not qualify.
- Receipt capture stores card last-4 + brand only. Never full PAN/expiry/CVV.
- All regulatory/eligibility copy needs counsel review before public launch.

## Secrets / env vars
- Never commit secrets. .env.local for dev (gitignored); Netlify env vars
  for prod. .env.example is the committed template.
- VITE_WEB3FORMS_KEY (waitlist), VITE_SENTRY_DSN (client, safe to expose),
  VITE_SENTRY_ENVIRONMENT. Build-only (Netlify env, NOT in client):
  SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN.

## Brand
- Display: Space Grotesk (use the .font-display utility). Body: Inter.
- Accent: #E5484D → #F97316 gradient (.candor-gradient / -text).
- Ink: stone-950 / stone-500 on white.
- Green badge = eligible, Amber = LMN, Orange = DPC (capped).

## Working style
- Propose a plan before large changes. One feature per conversation.
  Review diffs before accepting.
