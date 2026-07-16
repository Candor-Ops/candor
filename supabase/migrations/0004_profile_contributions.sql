-- Candor Week 3 — manual contribution tracking on profiles (Plaid-less
-- dashboard v1). Coverage type drives which IRS limit applies.
-- Run in the Supabase SQL editor after 0003.

alter table public.profiles
  add column if not exists coverage_type text
    check (coverage_type in ('self', 'family')),
  add column if not exists ytd_contributions numeric;
