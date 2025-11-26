-- ============================================
-- SCRIPT: Verificar y Corregir Constraint de Role
-- ============================================
-- Este script verifica el constraint de role en user_profiles
-- y lo corrige si es necesario
-- ============================================

-- 1. Verificar el constraint actual
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.user_profiles'::regclass
AND conname LIKE '%role%';

-- 2. Verificar los valores permitidos en el constraint
SELECT 
  conname,
  pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
AND contype = 'c' -- Check constraint
AND conname = 'user_profiles_role_check';

-- 3. Si el constraint no existe o está mal, eliminarlo y recrearlo
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 4. Recrear el constraint con los valores correctos
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('admin', 'repartidor', 'comerciante'));

-- 5. Verificar que se creó correctamente
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.user_profiles'::regclass
AND conname = 'user_profiles_role_check';

-- 6. Probar insertar un valor válido (solo para verificación, no se ejecutará realmente)
-- INSERT INTO public.user_profiles (id, email, name, role) 
-- VALUES (gen_random_uuid(), 'test@test.com', 'Test', 'comerciante');

-- 7. Verificar valores actuales en la tabla (para debugging)
SELECT 
  id,
  email,
  name,
  role,
  CASE 
    WHEN role IN ('admin', 'repartidor', 'comerciante') THEN 'Válido'
    ELSE 'INVÁLIDO'
  END as role_status
FROM public.user_profiles
LIMIT 10;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Este script asegura que el constraint de role esté correctamente configurado
-- con los valores: 'admin', 'repartidor', 'comerciante'


