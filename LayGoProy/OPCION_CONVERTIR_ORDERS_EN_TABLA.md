# 📋 Opción Alternativa: Convertir `orders` en Tabla Real

## ⚠️ Cuándo usar esta opción
Usa esta opción **SOLO** si:
- No quieres crear `delivery_orders`
- Prefieres usar solo `orders` como tabla principal
- Tu tabla `orders` actualmente es una vista y quieres convertirla en tabla

## ✅ Solución

### Paso 1: Verificar si `orders` es una vista
Ejecuta esto en Supabase SQL Editor:

```sql
SELECT table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'orders';
```

- Si dice `VIEW` → Es una vista, necesitas convertirla
- Si dice `BASE TABLE` → Ya es una tabla, puedes usarla directamente

### Paso 2: Si es una VISTA, convertirla en TABLA

```sql
-- Eliminar la vista si existe
DROP VIEW IF EXISTS public.orders CASCADE;

-- Crear la tabla orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  wholesale_total DECIMAL(10, 2),
  savings DECIMAL(10, 2),
  delivery_address TEXT,
  delivery_date DATE,
  delivery_time_slot VARCHAR(50),
  payment_method VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verificar que order_items apunte a orders
-- Si order_items apunta a delivery_orders, necesitarás actualizar la foreign key
DO $$
BEGIN
  -- Verificar si existe la foreign key
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_items_order_id_fkey'
    AND confrelid = 'public.delivery_orders'::regclass
  ) THEN
    -- Eliminar la foreign key antigua
    ALTER TABLE public.order_items
    DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
    
    -- Crear nueva foreign key apuntando a orders
    ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;
```

### Paso 3: Verificar
1. Deberías ver un mensaje de éxito
2. La tabla `orders` ahora debería ser una tabla real (no una vista)
3. Reinicia la aplicación

## 📝 Nota
- Esta opción es más simple pero menos completa que usar `delivery_orders`
- `delivery_orders` tiene más campos útiles para gestión de entregas
- Si en el futuro necesitas más funcionalidad, tendrás que migrar a `delivery_orders`

## ⚠️ Recomendación
**Te recomiendo usar la Opción 1** (crear `delivery_orders`) porque:
- Es más completa y escalable
- Tiene campos adicionales para gestión de entregas
- El dashboard administrativo está diseñado para trabajar con `delivery_orders`
- Puedes mantener `orders` como vista para compatibilidad

