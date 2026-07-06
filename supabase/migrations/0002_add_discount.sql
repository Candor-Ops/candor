-- Candor Week 2 addendum — optional discount amount on receipts.
-- "Total paid" (total) remains the load-bearing, IRS-reimbursable number;
-- subtotal / discount / tax are informational context:
--   total ≈ subtotal − discount + tax
-- Run in the Supabase SQL editor after 0001.

alter table public.receipts
  add column if not exists discount numeric;
