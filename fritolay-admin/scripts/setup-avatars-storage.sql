-- ============================================
-- Script para configurar Storage de avatares
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Crear el bucket 'avatars' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Bucket público para que las imágenes sean accesibles
  5242880,  -- 5MB límite
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Usuarios pueden ver avatares públicos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden subir su propio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden eliminar su propio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Acceso público a avatares" ON storage.objects;

-- 3. Política para permitir acceso público de lectura (SELECT)
CREATE POLICY "Acceso público a avatares"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 4. Política para que usuarios autenticados puedan subir imágenes
CREATE POLICY "Usuarios pueden subir su propio avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'profile-images'
);

-- 5. Política para que usuarios puedan actualizar sus propias imágenes
CREATE POLICY "Usuarios pueden actualizar su propio avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'profile-images'
);

-- 6. Política para que usuarios puedan eliminar sus propias imágenes
CREATE POLICY "Usuarios pueden eliminar su propio avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'profile-images'
);

-- 7. Verificar que el bucket se creó correctamente
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'avatars';

-- ============================================
-- Instrucciones adicionales (si es necesario)
-- ============================================
-- Si el script da error porque el bucket ya existe con otra configuración,
-- puedes actualizarlo manualmente desde el Dashboard de Supabase:
-- 1. Ve a Storage
-- 2. Busca o crea el bucket 'avatars'
-- 3. Asegúrate de que esté marcado como 'public'
-- 4. Configura las políticas RLS desde la pestaña Policies

