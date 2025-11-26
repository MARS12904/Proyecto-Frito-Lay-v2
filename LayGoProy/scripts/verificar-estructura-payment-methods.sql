-- ============================================
-- VERIFICAR ESTRUCTURA REAL DE payment_methods
-- ============================================
-- Este script muestra la estructura actual de la tabla
-- para identificar qué columnas tiene realmente

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;

-- Verificar constraints NOT NULL
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'payment_methods'
  AND tc.constraint_type = 'CHECK';
