-- ============================================================
-- MIGRACIÓN: Métodos de Pago con Estándares Peruanos
-- Ejecutar en el SQL Editor de tu Dashboard de Supabase
-- ============================================================

-- 1. Agregar las nuevas columnas si no existen
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS cci VARCHAR(20);
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS wallet_phone VARCHAR(9);
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS holder_name VARCHAR(255);
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS document_type VARCHAR(10) CHECK (document_type IN ('dni', 'ruc', 'ce'));
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS document_number VARCHAR(15);

-- 2. Actualizar la restricción check para permitir yape, plin y deposit
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_type_check;
ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_type_check 
  CHECK (type IN ('card', 'yape', 'plin', 'transfer', 'deposit', 'cash', 'credit'));

-- Confirmación
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_methods';
