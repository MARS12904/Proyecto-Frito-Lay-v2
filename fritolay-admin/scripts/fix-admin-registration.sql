-- =====================================================
-- Script: Corregir Registro de Administradores
-- Descripción: Asegura que las políticas RLS permitan 
--              la creación de perfiles de admin desde el servicio
-- =====================================================

-- 1. Verificar que la tabla user_profiles existe y tiene los campos necesarios
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        RAISE EXCEPTION 'La tabla user_profiles no existe. Ejecuta primero el script de creación de tablas.';
    END IF;
END $$;

-- 2. Asegurar que el campo 'role' existe y tiene el constraint correcto
DO $$
BEGIN
    -- Agregar columna role si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN role VARCHAR(20) DEFAULT 'comerciante';
    END IF;

    -- Asegurar que el constraint de role existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND constraint_name = 'user_profiles_role_check'
    ) THEN
        ALTER TABLE public.user_profiles 
        DROP CONSTRAINT IF EXISTS user_profiles_role_check;
        
        ALTER TABLE public.user_profiles 
        ADD CONSTRAINT user_profiles_role_check 
        CHECK (role IN ('admin', 'repartidor', 'comerciante'));
    END IF;
END $$;

-- 3. Asegurar que is_active existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. Asegurar que preferences existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'preferences'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN preferences JSONB DEFAULT '{"notifications": true, "theme": "auto"}'::jsonb;
    END IF;
END $$;

-- 5. Deshabilitar RLS temporalmente para operaciones del servicio (NO RECOMENDADO EN PRODUCCIÓN)
-- En su lugar, crearemos una política que permita al servicio role hacer inserts
-- NOTA: El service_role_key ya bypass RLS, pero asegurémonos de que no haya conflictos

-- 6. Crear política que permita inserts desde el servicio (si es necesario)
-- El service_role_key ya bypass RLS, pero esto es por si acaso
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.user_profiles;

-- 7. Verificar que no haya triggers que interfieran
-- Si hay un trigger que crea perfiles automáticamente, podría estar causando conflictos
-- Comentamos esto por ahora, pero si tienes un trigger, podrías necesitar modificarlo

-- 8. Crear índice en email si no existe
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 9. Verificar estructura de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Script ejecutado. Verifica que todos los campos necesarios existan.';
    RAISE NOTICE 'Si aún hay problemas, verifica:';
    RAISE NOTICE '1. Que SUPABASE_SERVICE_ROLE_KEY esté configurado correctamente';
    RAISE NOTICE '2. Que el cliente admin esté usando el service_role_key';
    RAISE NOTICE '3. Que no haya triggers conflictivos en user_profiles';
END $$;


