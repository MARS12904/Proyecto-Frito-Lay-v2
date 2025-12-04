-- ============================================
-- SCRIPT: Eliminar Columna vehicle_type de user_profiles
-- ============================================
-- Este script elimina la columna vehicle_type de la tabla user_profiles
-- después de verificar que no hay constraints o dependencias críticas
-- ============================================

-- 1. Verificar que la columna existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'vehicle_type'
    ) THEN
        RAISE NOTICE 'La columna vehicle_type no existe en user_profiles. No hay nada que eliminar.';
    ELSE
        RAISE NOTICE 'Columna vehicle_type encontrada. Procediendo con la eliminación...';
    END IF;
END $$;

-- 2. Verificar si hay constraints CHECK en vehicle_type
DO $$
DECLARE
    constraint_name text;
    constraint_count int := 0;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.user_profiles'::regclass
        AND contype = 'c' -- Check constraint
        AND pg_get_constraintdef(oid) LIKE '%vehicle_type%'
    LOOP
        RAISE NOTICE 'Eliminando constraint: %', constraint_name;
        BEGIN
            EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
            constraint_count := constraint_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error al eliminar constraint %: %', constraint_name, SQLERRM;
        END;
    END LOOP;
    IF constraint_count = 0 THEN
        RAISE NOTICE 'No se encontraron constraints CHECK relacionados con vehicle_type.';
    END IF;
END $$;

-- 3. Verificar si hay índices en vehicle_type
DO $$
DECLARE
    index_name text;
    index_count int := 0;
BEGIN
    FOR index_name IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'user_profiles'
        AND indexdef LIKE '%vehicle_type%'
    LOOP
        RAISE NOTICE 'Eliminando índice: %', index_name;
        BEGIN
            EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(index_name);
            index_count := index_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error al eliminar índice %: %', index_name, SQLERRM;
        END;
    END LOOP;
    IF index_count = 0 THEN
        RAISE NOTICE 'No se encontraron índices relacionados con vehicle_type.';
    END IF;
END $$;

-- 4. Eliminar la columna vehicle_type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'vehicle_type'
    ) THEN
        ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS vehicle_type;
        RAISE NOTICE 'Columna vehicle_type eliminada.';
    ELSE
        RAISE NOTICE 'La columna vehicle_type no existe. Saltando eliminación.';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al eliminar la columna vehicle_type: %', SQLERRM;
END $$;

-- 5. Verificar que se eliminó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'vehicle_type'
    ) THEN
        RAISE EXCEPTION 'Error: La columna vehicle_type aún existe después de intentar eliminarla.';
    ELSE
        RAISE NOTICE '✓ Columna vehicle_type eliminada exitosamente de user_profiles.';
    END IF;
END $$;

-- 6. Mostrar la estructura actualizada de la tabla (solo columnas relevantes)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
AND column_name IN ('id', 'email', 'name', 'phone', 'role', 'license_number', 'is_active', 'phone_verified')
ORDER BY ordinal_position;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- NOTA: Este script es seguro y puede ejecutarse múltiples veces sin problemas.
-- Si la columna ya no existe, simplemente mostrará un mensaje informativo.

