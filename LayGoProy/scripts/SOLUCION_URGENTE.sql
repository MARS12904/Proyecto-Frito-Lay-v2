-- ============================================
-- SOLUCIÓN URGENTE: Hacer nullable columnas problemáticas
-- ============================================
-- Ejecuta esto INMEDIATAMENTE en Supabase Dashboard
-- ============================================

-- Hacer nullable brand
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'brand'
  ) THEN
    ALTER TABLE public.payment_methods ALTER COLUMN brand DROP NOT NULL;
  END IF;
END $$;

-- Hacer nullable last4
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_methods' 
    AND column_name = 'last4'
  ) THEN
    ALTER TABLE public.payment_methods ALTER COLUMN last4 DROP NOT NULL;
  END IF;
END $$;

-- Verificar
SELECT column_name, is_nullable 
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
  AND column_name IN ('brand', 'last4');


