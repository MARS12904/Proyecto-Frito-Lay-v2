-- ============================================
-- ELIMINAR COLUMNAS JSONB EN DESUSO
-- ============================================
-- Este script elimina las columnas payment_methods y delivery_addresses
-- de la tabla user_profiles, ya que ahora se usan tablas dedicadas.
-- 
-- ⚠️ IMPORTANTE: Asegúrate de que todos los datos hayan sido migrados
-- a las tablas payment_methods y delivery_addresses antes de ejecutar esto.
-- ============================================

-- Verificar que las columnas existen antes de eliminarlas
DO $$
BEGIN
  -- Eliminar columna payment_methods si existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'payment_methods'
  ) THEN
    ALTER TABLE public.user_profiles DROP COLUMN payment_methods;
    RAISE NOTICE 'Columna payment_methods eliminada exitosamente';
  ELSE
    RAISE NOTICE 'Columna payment_methods no existe, omitiendo...';
  END IF;

  -- Eliminar columna delivery_addresses si existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'delivery_addresses'
  ) THEN
    ALTER TABLE public.user_profiles DROP COLUMN delivery_addresses;
    RAISE NOTICE 'Columna delivery_addresses eliminada exitosamente';
  ELSE
    RAISE NOTICE 'Columna delivery_addresses no existe, omitiendo...';
  END IF;
END $$;

-- Verificar que las columnas fueron eliminadas
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name IN ('payment_methods', 'delivery_addresses');

-- Si la consulta anterior no devuelve resultados, las columnas fueron eliminadas correctamente.


