# 📋 Instrucciones para Crear la Tabla `delivery_orders` en Supabase

## ⚠️ Problema
Si ves el error: `"Could not find the table 'public.delivery_orders' in the schema cache"` o `"Could not find the 'total_amount' column of 'orders'"`, significa que necesitas crear la tabla `delivery_orders` en tu base de datos de Supabase.

## ✅ Solución

### Paso 1: Abrir Supabase Dashboard
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto

### Paso 2: Abrir SQL Editor
1. En el menú lateral, haz clic en **"SQL Editor"**
2. Haz clic en **"New query"**

### Paso 3: Ejecutar el Script SQL
1. Copia y pega el siguiente script SQL:

```sql
-- ============================================
-- CREAR TABLA delivery_orders
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  wholesale_total DECIMAL(10, 2),
  savings DECIMAL(10, 2),
  co_wholesale DECIMAL(10, 2),
  payment_method VARCHAR(100),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  delivery_address TEXT,
  delivery_date DATE,
  delivery_time_slot VARCHAR(50),
  tracking_number VARCHAR(100),
  notes TEXT,
  assigned_delivery_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  assigned_dispatcher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'assigned', 'in_transit', 'delivered', 'failed', 'cancelled')),
  cancellation_reason TEXT,
  zone_id UUID,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para delivery_orders
CREATE INDEX IF NOT EXISTS idx_delivery_orders_order_number ON public.delivery_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_delivery_status ON public.delivery_orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_payment_status ON public.delivery_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_at ON public.delivery_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_by ON public.delivery_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_is_active ON public.delivery_orders(is_active);

-- RLS para delivery_orders
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own orders" ON public.delivery_orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.delivery_orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.delivery_orders;

-- Crear políticas RLS
CREATE POLICY "Users can view own orders"
  ON public.delivery_orders FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create own orders"
  ON public.delivery_orders FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own orders"
  ON public.delivery_orders FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ============================================
-- VERIFICAR QUE order_items EXISTE
-- ============================================

-- Si order_items no existe, crearla
-- Si ya existe, verificar y agregar columnas faltantes
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  product_id UUID,
  product_name VARCHAR(255) NOT NULL,
  product_brand VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  weight VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la tabla ya existe pero tiene 'unit_price' en lugar de 'price', agregar 'price'
DO $$
BEGIN
  -- Verificar si existe la columna 'price'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'price'
  ) THEN
    -- Si no existe 'price' pero existe 'unit_price', renombrar
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'order_items' 
      AND column_name = 'unit_price'
    ) THEN
      ALTER TABLE public.order_items RENAME COLUMN unit_price TO price;
    ELSE
      -- Si no existe ninguna, agregar 'price'
      ALTER TABLE public.order_items ADD COLUMN price DECIMAL(10, 2);
    END IF;
  END IF;
END $$;

-- Agregar foreign key si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_items_order_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.delivery_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Índices para order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- RLS para order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_orders
      WHERE delivery_orders.id = order_items.order_id
      AND delivery_orders.created_by = auth.uid()
    )
  );

-- Permitir insertar order_items para usuarios autenticados
DROP POLICY IF EXISTS "Users can create own order items" ON public.order_items;

CREATE POLICY "Users can create own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_orders
      WHERE delivery_orders.id = order_items.order_id
      AND delivery_orders.created_by = auth.uid()
    )
  );

-- ============================================
-- CREAR VISTA orders PARA COMPATIBILIDAD
-- ============================================
-- Esta vista permite que el código que usa 'orders' siga funcionando
-- mientras que los nuevos pedidos se guardan en 'delivery_orders'

-- IMPORTANTE: Si orders es una tabla con datos, primero migra los datos a delivery_orders
-- Si orders es una tabla vacía o no tiene datos importantes, puedes eliminarla directamente

-- Opción 1: Si orders tiene datos que quieres conservar, primero migra:
-- INSERT INTO public.delivery_orders (id, created_by, total, status, delivery_date, delivery_time_slot, payment_method, notes, created_at, updated_at)
-- SELECT id, user_id, total_amount, status, delivery_date, delivery_time_slot, payment_method, notes, created_at, updated_at
-- FROM public.orders;

-- Opción 2: Eliminar orders (tabla o vista) - EJECUTA ESTO MANUALMENTE según tu caso:
-- Si orders es una TABLA: DROP TABLE IF EXISTS public.orders CASCADE;
-- Si orders es una VISTA: DROP VIEW IF EXISTS public.orders CASCADE;

-- Para verificar qué tipo es, ejecuta primero:
-- SELECT table_type FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders';

-- Eliminar orders (maneja tanto tabla como vista)
-- Nota: Si orders tiene datos importantes, migra primero antes de eliminar
DO $$
DECLARE
  table_type_var TEXT;
BEGIN
  -- Verificar qué tipo de objeto es orders
  SELECT table_type INTO table_type_var
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'orders';
  
  -- Eliminar según el tipo
  IF table_type_var = 'BASE TABLE' THEN
    DROP TABLE public.orders CASCADE;
  ELSIF table_type_var = 'VIEW' THEN
    DROP VIEW public.orders CASCADE;
  END IF;
  -- Si no existe (table_type_var IS NULL), no hacer nada
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay algún error, intentar eliminar de ambas formas
    BEGIN
      DROP TABLE IF EXISTS public.orders CASCADE;
    EXCEPTION
      WHEN OTHERS THEN
        DROP VIEW IF EXISTS public.orders CASCADE;
    END;
END $$;

CREATE VIEW public.orders AS
SELECT 
  id,
  created_by as user_id,  -- Mapear created_by a user_id para compatibilidad
  status,
  total as total_amount,  -- Mapear total a total_amount
  wholesale_total,
  savings,
  payment_method,
  delivery_date,
  delivery_time_slot,
  notes,
  created_at,
  updated_at,
  -- Campos adicionales
  order_number,
  co_wholesale,
  payment_status,
  tracking_number,
  deleted_at,
  assigned_dispatcher_id,
  delivery_status,
  cancellation_reason,
  zone_id,
  is_active,
  assigned_at,
  created_by
FROM public.delivery_orders
WHERE deleted_at IS NULL;  -- Solo mostrar pedidos no eliminados

COMMENT ON VIEW public.orders IS 'Vista de compatibilidad: apunta a delivery_orders. Los nuevos pedidos se guardan en delivery_orders.';
```

2. Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

### Paso 4: Verificar
1. Deberías ver un mensaje de éxito
2. La tabla `delivery_orders` ahora debería estar creada
3. Reinicia la aplicación para que los cambios surtan efecto

## 📝 Nota
- El script usa `CREATE TABLE IF NOT EXISTS`, por lo que es seguro ejecutarlo múltiples veces
- La tabla se creará en el esquema `public`
- Las políticas RLS (Row Level Security) aseguran que los usuarios solo puedan ver/editar sus propios pedidos
- Si `order_items` ya existe, el script no la recreará, solo agregará la foreign key si falta

## 🔄 Alternativa: Usar el Script Completo
También puedes usar el archivo `scripts/reset-complete-database-corrected.sql` que está en el proyecto para crear todas las tablas necesarias.

