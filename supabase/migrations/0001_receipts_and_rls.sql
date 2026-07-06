-- Candor Week 2 — receipts table, row-level security, private photo storage.
-- Run in the Supabase SQL editor (or `supabase db push`) BEFORE any real data
-- is inserted. RLS here is default-deny and mandatory: forgetting it is a
-- data leak, not a bug.

-- ============================================================
-- 1. receipts table
-- ============================================================
-- `id` is text, not uuid: the vault component generates its own ids
-- ("r_<timestamp>") and the Week 2 contract is a drop-in adapter with zero
-- component changes. RLS scopes rows by user_id regardless of id format.
--
-- GUARDRAIL: card_last4 is constrained to 0–4 digits at the schema level —
-- a second line of defense behind the capture form. There is deliberately
-- NO column that could hold a full PAN, expiry, or CVV.

create table public.receipts (
  id               text primary key,
  user_id          uuid not null default auth.uid()
                     references auth.users (id) on delete cascade,
  product          text not null,
  merchant         text,
  date             date,
  subtotal         numeric,
  tax              numeric,
  total            numeric,
  category         text,
  pay_source       text check (pay_source in ('out-of-pocket', 'hsa-card')),
  card_brand       text,
  card_last4       text check (card_last4 ~ '^[0-9]{0,4}$'),
  hsa_open_at_time boolean default true,
  notes            text,
  photo_path       text,  -- Storage object path in receipt-photos bucket; NOT a data URL
  status           text check (status in ('deferred', 'reimbursed', 'paid-from-hsa')),
  created_at       timestamptz not null default now()
);

create index receipts_user_id_idx on public.receipts (user_id);

-- ============================================================
-- 2. Row-level security — default-deny + own-rows-only policies
-- ============================================================
alter table public.receipts enable row level security;

create policy "own receipts - select" on public.receipts
  for select using (auth.uid() = user_id);

create policy "own receipts - insert" on public.receipts
  for insert with check (auth.uid() = user_id);

create policy "own receipts - update" on public.receipts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own receipts - delete" on public.receipts
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 3. Private storage bucket for receipt photos
-- ============================================================
-- Objects live under "<user_id>/<receipt_id>.jpg". Policies allow each user
-- to touch only objects under their own uuid prefix. Bucket is PRIVATE:
-- display uses short-lived signed URLs, never public URLs.

insert into storage.buckets (id, name, public)
values ('receipt-photos', 'receipt-photos', false)
on conflict (id) do nothing;

create policy "own photos - read" on storage.objects
  for select using (
    bucket_id = 'receipt-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own photos - insert" on storage.objects
  for insert with check (
    bucket_id = 'receipt-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own photos - update" on storage.objects
  for update using (
    bucket_id = 'receipt-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own photos - delete" on storage.objects
  for delete using (
    bucket_id = 'receipt-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
