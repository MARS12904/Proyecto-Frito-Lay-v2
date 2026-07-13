-- Migration: add delivery_fee and delivery_zone to orders
-- Run this in Supabase SQL editor or via psql

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_zone text;

-- Optional: update existing rows to set delivery_zone = 'lima-centro' where unknown
-- UPDATE public.orders SET delivery_zone = 'lima-centro' WHERE delivery_zone IS NULL;
