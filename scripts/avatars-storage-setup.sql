-- ============================================================
-- CONFIGURACIÓN DE STORAGE EN SUPABASE PARA AVATARES
-- Ejecutar en el SQL Editor de tu Dashboard de Supabase
-- ============================================================

-- 1. Crear el bucket 'avatars' si no existe y configurarlo como público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Seguridad RLS para el bucket 'avatars'

-- Política A: Acceso público de lectura a todos los archivos del bucket
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
CREATE POLICY "Avatar Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Política B: Permitir a usuarios autenticados subir sus propias imágenes
-- El nombre del archivo debe comenzar con el ID del usuario en la carpeta profile-images
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (split_part(name, '/', 2) LIKE auth.uid()::text || '%')
  );

-- Política C: Permitir a usuarios autenticados actualizar su propia imagen
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (split_part(name, '/', 2) LIKE auth.uid()::text || '%')
  )
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (split_part(name, '/', 2) LIKE auth.uid()::text || '%')
  );

-- Política D: Permitir a usuarios autenticados eliminar su propia imagen
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (split_part(name, '/', 2) LIKE auth.uid()::text || '%')
  );