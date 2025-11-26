-- ============================================
-- SCRIPT: Verificar y Corregir Trigger para user_profiles
-- ============================================
-- Este script verifica y corrige el trigger que crea automáticamente
-- el perfil de usuario cuando se registra en Supabase Auth
-- ============================================

-- 1. Verificar si la función existe
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Verificar si el trigger existe
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as is_enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Eliminar trigger y función existentes (si hay errores)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 4. Crear la función con manejo de errores mejorado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Intentar insertar el perfil
  -- Asegurarse de que el role sea exactamente uno de los valores permitidos
  INSERT INTO public.user_profiles (
    id, 
    email, 
    name, 
    role, 
    is_active,
    preferences
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Usuario'),
    -- Validar que el role sea uno de los valores permitidos
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'comerciante') IN ('admin', 'repartidor', 'comerciante') 
      THEN COALESCE(NEW.raw_user_meta_data->>'role', 'comerciante')
      ELSE 'comerciante' -- Valor por defecto si el role no es válido
    END,
    true,
    '{"notifications": true, "theme": "auto"}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING; -- Evitar errores si el perfil ya existe
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero no fallar el registro del usuario
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 5. Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Verificar que se creó correctamente
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as is_enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- 7. Verificar permisos de la tabla user_profiles
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 8. Verificar políticas RLS para INSERT en user_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles' AND cmd = 'INSERT';

-- ============================================
-- NOTA: Si las políticas RLS están bloqueando INSERTs,
-- necesitas agregar una política que permita al trigger insertar
-- ============================================

-- 9. Crear política RLS para permitir que el trigger inserte perfiles
-- (Solo si no existe ya)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Trigger can insert profiles'
  ) THEN
    CREATE POLICY "Trigger can insert profiles"
      ON public.user_profiles
      FOR INSERT
      WITH CHECK (true); -- Permitir todas las inserciones desde el trigger
  END IF;
END $$;

-- O mejor aún, permitir que el trigger (que usa SECURITY DEFINER) pueda insertar
-- sin restricciones RLS. Esto se hace deshabilitando RLS temporalmente en la función
-- o usando SECURITY DEFINER correctamente.

-- 10. Verificar que la función tiene SECURITY DEFINER
SELECT 
  proname,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Si después de ejecutar este script aún hay errores:
-- 1. Verifica que la tabla user_profiles existe
-- 2. Verifica que las políticas RLS permiten INSERT
-- 3. Verifica los logs de Supabase para más detalles del error

