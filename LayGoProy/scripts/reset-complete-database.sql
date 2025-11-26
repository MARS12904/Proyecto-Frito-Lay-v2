-- ============================================
-- SCRIPT COMPLETO: RESET Y RECREAR BASE DE DATOS
-- ============================================
-- ⚠️ ADVERTENCIA: Este script eliminará TODAS las tablas
-- y las recreará desde cero. PERDERÁS TODOS LOS DATOS.
-- 
-- ⚠️ IMPORTANTE: Ejecuta este script solo si estás seguro.
-- No se puede deshacer.
--
-- Para ejecutar:
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Abre el SQL Editor
-- 3. Pega este script completo
-- 4. Ejecuta el script
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR TODAS LAS TABLAS (en orden correcto)
-- ============================================

-- Desactivar temporalmente las restricciones
SET session_replication_role = 'replica';

-- Eliminar tablas dependientes primero
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS delivery_assignments CASCADE;
DROP TABLE IF EXISTS delivery_attempts CASCADE;
DROP TABLE IF EXISTS delivery_tracking CASCADE;
DROP TABLE IF EXISTS repartidor_zones CASCADE;
DROP TABLE IF EXISTS user_carts CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Eliminar funciones y triggers
DROP FUNCTION IF EXISTS update_user_carts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Reactivar restricciones
SET session_replication_role = 'origin';

-- ============================================
-- PASO 2: CREAR TABLA user_profiles
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'comerciante' CHECK (role IN ('admin', 'repartidor', 'comerciante')),
  is_active BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{"notifications": true, "theme": "auto"}'::jsonb,
  payment_methods JSONB DEFAULT '[]'::jsonb,
  delivery_addresses JSONB DEFAULT '[]'::jsonb,
  vehicle_type VARCHAR(50),
  license_number VARCHAR(50),
  phone_verified BOOLEAN DEFAULT false,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_payment_methods ON public.user_profiles USING GIN (payment_methods);
CREATE INDEX IF NOT EXISTS idx_user_profiles_delivery_addresses ON public.user_profiles USING GIN (delivery_addresses);

-- RLS para user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PASO 3: CREAR TABLA products
-- ============================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  wholesale_price DECIMAL(10, 2),
  stock INTEGER DEFAULT 0,
  category VARCHAR(100),
  weight VARCHAR(50),
  image TEXT,
  is_available BOOLEAN DEFAULT true,
  min_order_quantity INTEGER DEFAULT 1,
  max_order_quantity INTEGER DEFAULT 100,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para products
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available);

-- RLS para products (todos pueden ver productos disponibles)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available products"
  ON public.products FOR SELECT
  USING (is_available = true);

-- ============================================
-- PASO 4: CREAR TABLA orders
-- ============================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  delivery_address TEXT,
  delivery_date DATE,
  delivery_time_slot VARCHAR(50),
  payment_method VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- RLS para orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- PASO 5: CREAR TABLA order_items
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_brand VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  weight VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- RLS para order_items (heredado de orders)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- ============================================
-- PASO 6: CREAR TABLA user_carts
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_wholesale_mode BOOLEAN DEFAULT true,
  delivery_schedule JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índice para user_carts
CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON public.user_carts(user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_carts_updated_at
  BEFORE UPDATE ON public.user_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_carts_updated_at();

-- RLS para user_carts
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart"
  ON public.user_carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart"
  ON public.user_carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON public.user_carts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart"
  ON public.user_carts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PASO 7: CREAR TABLA delivery_assignments
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  repartidor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_transit', 'delivered', 'failed')),
  notes TEXT,
  UNIQUE(order_id)
);

-- Índices para delivery_assignments
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order_id ON public.delivery_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_repartidor_id ON public.delivery_assignments(repartidor_id);

-- RLS para delivery_assignments
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 8: CREAR TABLA repartidor_zones
-- ============================================

CREATE TABLE IF NOT EXISTS public.repartidor_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repartidor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  zone_name VARCHAR(100) NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 15.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para repartidor_zones
CREATE INDEX IF NOT EXISTS idx_repartidor_zones_repartidor_id ON public.repartidor_zones(repartidor_id);

-- RLS para repartidor_zones
ALTER TABLE public.repartidor_zones ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 9: CREAR TABLA delivery_tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.delivery_assignments(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL,
  location TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Índices para delivery_tracking
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_id ON public.delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_timestamp ON public.delivery_tracking(timestamp DESC);

-- RLS para delivery_tracking
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 10: CREAR TABLA delivery_attempts
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.delivery_assignments(id) ON DELETE SET NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) NOT NULL CHECK (status IN ('failed', 'success', 'rescheduled')),
  reason TEXT,
  next_attempt_date DATE
);

-- Índices para delivery_attempts
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_order_id ON public.delivery_attempts(order_id);

-- RLS para delivery_attempts
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 11: CREAR TABLA system_settings
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- RLS para system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insertar configuraciones por defecto
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('app_name', '"Frito Lay Admin"', 'Nombre de la aplicación'),
  ('maintenance_mode', 'false', 'Modo de mantenimiento'),
  ('max_order_amount', '10000', 'Monto máximo por pedido'),
  ('delivery_fee_base', '5.00', 'Tarifa base de envío'),
  ('currency', '"PEN"', 'Moneda del sistema')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- PASO 12: CREAR TRIGGER PARA user_profiles
-- ============================================

-- Función para crear perfil automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'comerciante'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función cuando se crea un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Verificar que todas las tablas fueron creadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- ✅ Base de datos completamente reseteada y recreada
-- ✅ Todas las tablas, índices, triggers y políticas RLS están configurados
-- ✅ Puedes comenzar a usar la aplicación desde cero


