-- Candor Week 5 — entitlement tier on profiles (PRD pricing).
-- Deliberately simple: a tier column + gate checks, not a billing platform.
-- free = everything except tax exports · tax_pass = one-time seasonal unlock
-- · plus = subscription (includes tax_pass).
-- Run in the Supabase SQL editor after 0005.

alter table public.profiles
  add column if not exists tier text not null default 'free'
    check (tier in ('free', 'tax_pass', 'plus'));
