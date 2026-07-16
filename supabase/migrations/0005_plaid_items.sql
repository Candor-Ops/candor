-- Candor Week 3 — Plaid item storage (SANDBOX).
--
-- ⚠️ SANDBOX-GRADE TRADEOFF, read before production:
-- RLS lets a user read their own row, which includes access_token — meaning
-- the browser *could* fetch its own Plaid token via the REST API. For sandbox
-- (fake banks, fake data) this is acceptable and keeps the architecture
-- simple (no service_role anywhere). BEFORE production Plaid: move tokens to
-- a table with NO client select policy and access them exclusively from
-- server functions with a service key, or use a secrets vault.
-- Run in the Supabase SQL editor after 0004.

create table public.plaid_items (
  item_id          text primary key,
  user_id          uuid not null default auth.uid()
                     references auth.users (id) on delete cascade,
  access_token     text not null,
  institution_name text,
  created_at       timestamptz not null default now()
);

alter table public.plaid_items enable row level security;

create policy "own items - select" on public.plaid_items
  for select using (auth.uid() = user_id);

create policy "own items - insert" on public.plaid_items
  for insert with check (auth.uid() = user_id);

create policy "own items - delete" on public.plaid_items
  for delete using (auth.uid() = user_id);
