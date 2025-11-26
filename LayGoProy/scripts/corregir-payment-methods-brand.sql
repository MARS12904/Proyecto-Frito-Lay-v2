-- ============================================
-- CORREGIR COLUMNA brand EN payment_methods
-- ============================================
-- Este script hace que la columna brand sea nullable
-- o le asigna un valor por defecto

-- Opción 1: Hacer brand nullable (si no es necesario)
ALTER TABLE public.payment_methods 
ALTER COLUMN brand DROP NOT NULL;

-- O si la columna no existe pero el error persiste, verificar:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'payment_methods' AND column_name = 'brand';

-- Opción 2: Si brand debe existir, agregar valor por defecto
-- ALTER TABLE public.payment_methods 
-- ALTER COLUMN brand SET DEFAULT 'N/A';

-- Verificar estructura final
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
  AND column_name = 'brand';


