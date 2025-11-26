-- ============================================
-- SOLUCIÓN INMEDIATA: payment_methods
-- ============================================
-- Este script hace nullable TODAS las columnas problemáticas
-- y agrega las que faltan
-- ============================================

-- Hacer nullable todas las columnas que puedan causar problemas
ALTER TABLE public.payment_methods 
ALTER COLUMN brand DROP NOT NULL;

ALTER TABLE public.payment_methods 
ALTER COLUMN last4 DROP NOT NULL;

-- Agregar columnas si no existen
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS type VARCHAR(50);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS card_number VARCHAR(19);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(7);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS bank VARCHAR(255);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verificar estructura final
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;


