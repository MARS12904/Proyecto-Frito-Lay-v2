-- ============================================
-- FIX: Registro de comerciantes (user_profiles)
-- Ejecutar en Supabase → SQL Editor (nueva BD)
-- ============================================

-- 1) Política INSERT: el usuario puede crear su propio perfil
DROP POLICY IF EXISTS "profile_insert_own" ON public.user_profiles;
CREATE POLICY "profile_insert_own"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2) Trigger automático al crear usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, is_active, preferences)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1), 'Comerciante'),
    true,
    '{"notifications": true, "theme": "auto"}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3) RPC de respaldo: crear perfil si el trigger falló (requiere sesión activa)
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS SETOF public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No hay sesión activa. Confirma tu email o inicia sesión.';
  END IF;

  RETURN QUERY
  INSERT INTO public.user_profiles (id, email, name, phone, is_active, preferences)
  SELECT
    u.id,
    COALESCE(u.email, ''),
    COALESCE(NULLIF(trim(p_name), ''), u.raw_user_meta_data->>'name', split_part(COALESCE(u.email, ''), '@', 1), 'Comerciante'),
    NULLIF(trim(p_phone), ''),
    true,
    '{"notifications": true, "theme": "auto"}'::jsonb
  FROM auth.users u
  WHERE u.id = v_uid
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
    updated_at = NOW()
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile(TEXT, TEXT) TO authenticated;

-- 4) Perfiles huérfanos: usuarios en Auth sin fila en user_profiles
INSERT INTO public.user_profiles (id, email, name, is_active, preferences)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'name', split_part(COALESCE(u.email, ''), '@', 1), 'Comerciante'),
  true,
  '{"notifications": true, "theme": "auto"}'::jsonb
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verificación
SELECT COUNT(*) AS perfiles_totales FROM public.user_profiles;
