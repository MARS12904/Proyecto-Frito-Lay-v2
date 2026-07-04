-- Migración v2: métodos de pago peruanos, storage avatars, productos Frito Lay PE
-- Ejecutar en Supabase SQL Editor

-- 1. Ampliar payment_methods
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_type_check;
ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_type_check
  CHECK (type IN ('card', 'yape', 'plin', 'transfer', 'deposit', 'cash', 'credit'));

ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS wallet_phone VARCHAR(15);
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS cci VARCHAR(20);
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS document_type VARCHAR(10);
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS document_number VARCHAR(20);
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS holder_name VARCHAR(255);

-- 2. Bucket avatars (Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY IF NOT EXISTS "avatars_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "avatars_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "avatars_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Productos Frito Lay Perú (categorías alineadas con filtros)
DELETE FROM public.products WHERE category = 'Snacks';

INSERT INTO public.products (name, brand, description, price, wholesale_price, stock, category, weight, is_available, min_order_quantity, max_order_quantity, tags)
VALUES
  ('Lay''s Clásico', 'Lay''s', 'Papas fritas clásicas con sal', 4.00, 3.20, 500, 'papas', '150g', true, 12, 120, ARRAY['clasico','papas']),
  ('Lay''s Queso', 'Lay''s', 'Papas fritas sabor queso', 4.20, 3.30, 400, 'papas', '150g', true, 12, 120, ARRAY['queso','papas']),
  ('Lay''s Barbacoa', 'Lay''s', 'Edición limitada sabor barbacoa', 4.50, 3.60, 200, 'papas', '150g', true, 12, 60, ARRAY['barbacoa','nuevo','papas']),
  ('Doritos Nacho Cheese', 'Doritos', 'Tortillas sabor queso nacho', 4.50, 3.60, 450, 'doritos', '145g', true, 12, 120, ARRAY['nacho','tortilla']),
  ('Doritos Flamin Hot', 'Doritos', 'Tortillas extra picantes', 4.50, 3.60, 300, 'doritos', '145g', true, 12, 120, ARRAY['picante','nuevo','tortilla']),
  ('Doritos Dinamita', 'Doritos', 'Tortillas enrolladas picantes', 4.50, 3.60, 280, 'doritos', '145g', true, 12, 120, ARRAY['dinamita','nuevo']),
  ('Cheetos Queso Clásico', 'Cheetos', 'Snacks inflados sabor queso', 4.20, 3.30, 420, 'cheetos', '150g', true, 12, 120, ARRAY['queso','maiz']),
  ('Cheetos Flamin Hot', 'Cheetos', 'Snacks extra picantes', 4.50, 3.60, 300, 'cheetos', '150g', true, 12, 120, ARRAY['picante','maiz']),
  ('Cheese Tris Queso', 'Cheese Tris', 'Snacks locales sabor queso', 4.00, 3.10, 350, 'cheese-tris', '150g', true, 12, 120, ARRAY['queso','local']),
  ('Chizitos Queso Natural', 'Chizitos', 'Snacks sabor queso natural', 3.80, 3.00, 260, 'chizitos', '150g', true, 12, 120, ARRAY['queso','maiz']),
  ('Piqueo Snax Mix Clásico', 'Piqueo Snax', 'Mix clásico de snacks', 5.00, 4.00, 240, 'piqueo', '145g', true, 12, 96, ARRAY['mix','clasico']),
  ('Piqueo Snax Picante Mixto', 'Piqueo Snax', 'Mix picante de snacks', 5.00, 4.00, 200, 'piqueo', '145g', true, 12, 96, ARRAY['picante','mix']),
  ('Cuates Natural', 'Cuates', 'Tortillas sabor natural', 3.80, 3.00, 260, 'cuates', '150g', true, 12, 120, ARRAY['tortilla','natural']),
  ('Cuates Picante', 'Cuates', 'Tortillas sabor picante', 3.80, 3.00, 240, 'cuates', '150g', true, 12, 120, ARRAY['tortilla','picante']),
  ('Cuates Rancherito', 'Cuates', 'Tortillas sabor rancherito', 3.80, 3.00, 220, 'cuates', '150g', true, 12, 120, ARRAY['tortilla','rancherito'])
ON CONFLICT DO NOTHING;
