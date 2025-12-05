-- ============================================
-- Script para agregar columna image a products
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Verificar si la columna existe antes de crearla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'image'
  ) THEN
    ALTER TABLE public.products ADD COLUMN image TEXT;
    RAISE NOTICE 'Columna image agregada correctamente';
  ELSE
    RAISE NOTICE 'La columna image ya existe';
  END IF;
END $$;

-- Verificar la estructura actual de la tabla products
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

