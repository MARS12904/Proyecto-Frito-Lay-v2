-- ============================================
-- SCRIPT: Agregar relación directa entre delivery_orders y delivery_addresses
-- ============================================
-- Este script agrega una columna delivery_address_id a delivery_orders
-- para relacionar directamente con la tabla delivery_addresses.
-- Esto es más eficiente que buscar la dirección a través de created_by.
-- ============================================

-- PASO 1: Agregar columna delivery_address_id a delivery_orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_orders' 
        AND column_name = 'delivery_address_id'
    ) THEN
        ALTER TABLE public.delivery_orders 
        ADD COLUMN delivery_address_id UUID;
        
        RAISE NOTICE '✓ Columna delivery_address_id agregada a delivery_orders';
    ELSE
        RAISE NOTICE 'La columna delivery_address_id ya existe en delivery_orders';
    END IF;
END $$;

-- PASO 2: Agregar Foreign Key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'delivery_orders_delivery_address_id_fkey'
        AND table_name = 'delivery_orders'
    ) THEN
        ALTER TABLE public.delivery_orders 
        ADD CONSTRAINT delivery_orders_delivery_address_id_fkey 
        FOREIGN KEY (delivery_address_id) 
        REFERENCES public.delivery_addresses(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE '✓ Foreign Key delivery_orders_delivery_address_id_fkey creada';
    ELSE
        RAISE NOTICE 'El constraint delivery_orders_delivery_address_id_fkey ya existe';
    END IF;
END $$;

-- PASO 3: Crear índice para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_delivery_orders_delivery_address_id 
ON public.delivery_orders(delivery_address_id);

-- PASO 4: Migrar datos existentes (opcional)
-- Para pedidos existentes, intentar asignar la dirección por defecto del usuario
DO $$
DECLARE
    updated_count INTEGER := 0;
    order_record RECORD;
BEGIN
    -- Actualizar pedidos que no tienen delivery_address_id pero tienen created_by
    FOR order_record IN 
        SELECT dord.id, dord.created_by 
        FROM public.delivery_orders dord
        WHERE dord.delivery_address_id IS NULL 
        AND dord.created_by IS NOT NULL
        AND (dord.delivery_address IS NULL OR dord.delivery_address = '')
    LOOP
        -- Intentar asignar la dirección por defecto del usuario
        UPDATE public.delivery_orders 
        SET delivery_address_id = (
            SELECT da.id 
            FROM public.delivery_addresses da 
            WHERE da.user_id = order_record.created_by 
            ORDER BY da.is_default DESC, da.created_at DESC 
            LIMIT 1
        )
        WHERE id = order_record.id
        AND (
            SELECT COUNT(*) FROM public.delivery_addresses 
            WHERE user_id = order_record.created_by
        ) > 0;
        
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✓ % pedidos actualizados con delivery_address_id', updated_count;
END $$;

-- PASO 5: Crear función helper para obtener dirección completa
CREATE OR REPLACE FUNCTION public.get_delivery_address_info(p_order_id UUID)
RETURNS TABLE(
    address TEXT,
    zone TEXT,
    reference TEXT,
    label TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(da.address, dord.delivery_address, '')::TEXT as address,
        COALESCE(da.zone, '')::TEXT as zone,
        COALESCE(da.reference, '')::TEXT as reference,
        COALESCE(da.label, '')::TEXT as label
    FROM public.delivery_orders dord
    LEFT JOIN public.delivery_addresses da ON dord.delivery_address_id = da.id
    WHERE dord.id = p_order_id;
    
    -- Si no se encontró con delivery_address_id, intentar con created_by
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            COALESCE(da.address, dord.delivery_address, '')::TEXT as address,
            COALESCE(da.zone, '')::TEXT as zone,
            COALESCE(da.reference, '')::TEXT as reference,
            COALESCE(da.label, '')::TEXT as label
        FROM public.delivery_orders dord
        LEFT JOIN public.delivery_addresses da ON da.user_id = dord.created_by AND da.is_default = true
        WHERE dord.id = p_order_id;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Dar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION public.get_delivery_address_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_address_info(UUID) TO anon;

-- PASO 6: Crear vista para facilitar consultas
CREATE OR REPLACE VIEW public.delivery_orders_with_address AS
SELECT 
    dord.*,
    COALESCE(da.address, dord.delivery_address) as full_delivery_address,
    da.zone as delivery_zone,
    da.reference as delivery_reference,
    da.label as address_label,
    up.name as customer_name,
    up.phone as customer_phone,
    up.email as customer_email
FROM public.delivery_orders dord
LEFT JOIN public.delivery_addresses da ON dord.delivery_address_id = da.id
LEFT JOIN public.user_profiles up ON dord.created_by = up.id;

-- PASO 7: Verificar la estructura actual
SELECT 
    'delivery_orders' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'delivery_orders'
AND column_name IN ('delivery_address', 'delivery_address_id', 'created_by')
ORDER BY column_name;

-- ============================================
-- RESUMEN DE CAMBIOS:
-- ============================================
-- 1. Nueva columna: delivery_orders.delivery_address_id (UUID, FK → delivery_addresses.id)
-- 2. Índice creado para mejorar rendimiento
-- 3. Datos migrados: pedidos existentes ahora tienen delivery_address_id
-- 4. Función helper: get_delivery_address_info(order_id)
-- 5. Vista creada: delivery_orders_with_address
--
-- NUEVA RELACIÓN:
--   delivery_orders.delivery_address_id → delivery_addresses.id
--
-- USO EN CONSULTAS:
--   SELECT * FROM delivery_orders_with_address WHERE id = 'order-uuid';
--   SELECT * FROM get_delivery_address_info('order-uuid');
-- ============================================

