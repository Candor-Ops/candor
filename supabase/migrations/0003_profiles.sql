-- Candor Week 2 — user profiles: HSA establishment date.
-- The IRS only allows tax-free reimbursement of expenses incurred AFTER the
-- HSA was established. Capturing the date once lets the app set the
-- per-receipt "HSA was open" flag automatically instead of asking every time.
-- Run in the Supabase SQL editor after 0002.

create table public.profiles (
  user_id              uuid primary key default auth.uid()
                         references auth.users (id) on delete cascade,
  hsa_established_date date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile - select" on public.profiles
  for select using (auth.uid() = user_id);

create policy "own profile - insert" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "own profile - update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
