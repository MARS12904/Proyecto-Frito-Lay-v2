-- ============================================
-- SCRIPT: Corregir Recursión Infinita en RLS de user_profiles
-- ============================================
-- Este script soluciona el error: 
-- "infinite recursion detected in policy for relation 'user_profiles'"
-- 
-- El problema ocurre cuando una política RLS en user_profiles
-- consulta la misma tabla user_profiles, creando un bucle infinito.
-- ============================================

-- PASO 1: Crear función auxiliar con SECURITY DEFINER
-- Esta función puede consultar user_profiles sin activar las políticas RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Dar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- PASO 2: Crear función para verificar si es repartidor
CREATE OR REPLACE FUNCTION public.is_repartidor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'repartidor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_repartidor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_repartidor() TO anon;

-- PASO 3: Crear función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM public.user_profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'cliente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;

-- PASO 4: Eliminar las políticas problemáticas de user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Repartidores can view customer profiles" ON public.user_profiles;

-- PASO 5: Recrear las políticas usando las funciones auxiliares

-- Política: Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Política: Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Administradores pueden ver todos los perfiles (SIN RECURSIÓN)
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (public.is_admin());

-- Política: Administradores pueden actualizar todos los perfiles
CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (public.is_admin());

-- Política: Administradores pueden insertar perfiles
CREATE POLICY "Admins can insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() = id);

-- Política: Permitir inserción durante registro (service role o el propio usuario)
CREATE POLICY "Allow profile creation on signup"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- PASO 6: Verificar que RLS está habilitado
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- PASO 7: Mostrar las políticas actuales
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
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Las funciones con SECURITY DEFINER se ejecutan con los permisos
--    del usuario que las creó (normalmente el superusuario), por lo que
--    pueden consultar tablas sin estar sujetas a las políticas RLS.
--
-- 2. Esto evita la recursión infinita porque is_admin() no activa
--    las políticas RLS de user_profiles.
--
-- 3. Después de ejecutar este script, intenta iniciar sesión nuevamente.
-- ============================================

