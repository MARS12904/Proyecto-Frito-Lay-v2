-- ============================================
-- SCRIPT COMPLETO: CONFIGURACIÓN TOTAL DE LA BASE DE DATOS
-- Proyecto Frito Lay - Aplicaciones Web y Móvil
-- ============================================
-- ⚠️ ADVERTENCIA: Este script configura la base de datos desde cero.
-- Eliminará tablas existentes y las recreará. PERDERÁS TODOS LOS DATOS.
--
-- ⚠️ IMPORTANTE: Ejecuta este script solo en desarrollo o si estás seguro.
-- No se puede deshacer.
--
-- Instrucciones:
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Abre el SQL Editor
-- 3. Copia y pega todo este script
-- 4. Ejecuta el script completo
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR TABLAS EXISTENTES (orden correcto)
-- ============================================

-- Desactivar temporalmente las restricciones para evitar errores
SET session_replication_role = 'replica';

-- Eliminar tablas dependientes primero
DROP TABLE IF EXISTS delivery_tracking CASCADE;
DROP TABLE IF EXISTS delivery_attempts CASCADE;
DROP TABLE IF EXISTS delivery_assignments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS delivery_orders CASCADE;
DROP TABLE IF EXISTS delivery_addresses CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS delivery_personnel CASCADE;
DROP TABLE IF EXISTS repartidor_zones CASCADE;
DROP TABLE IF EXISTS user_carts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
-- Eliminar vista de compatibilidad si existe
DROP VIEW IF EXISTS orders CASCADE;

-- Eliminar funciones y triggers
DROP FUNCTION IF EXISTS update_payment_methods_updated_at() CASCADE;
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
  phone VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  profile_image_url TEXT,
  role VARCHAR(20) DEFAULT 'comerciante' CHECK (role IN ('admin', 'repartidor', 'comerciante')),
  preferences JSONB DEFAULT '{"notifications": true, "theme": "auto"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vehicle_type VARCHAR(50),
  license_number VARCHAR(50),
  phone_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- RLS para user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política adicional para administradores (pueden ver todos los perfiles)
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- PASO 3: CREAR TABLA delivery_addresses
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  label VARCHAR(100),
  zone VARCHAR(100),
  address TEXT NOT NULL,
  reference VARCHAR(255),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para delivery_addresses
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON public.delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_is_default ON public.delivery_addresses(is_default);

-- RLS para delivery_addresses
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses"
  ON public.delivery_addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PASO 4: CREAR TABLA payment_methods
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'transfer', 'cash', 'credit')),
  name VARCHAR(255) NOT NULL,
  card_number VARCHAR(19),
  expiry_date VARCHAR(7),
  bank VARCHAR(255),
  account_number VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON public.payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON public.payment_methods(type);

-- RLS para payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment methods"
  ON public.payment_methods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- ============================================
-- PASO 5: CREAR TABLA repartidor_zones
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

CREATE POLICY "Repartidores can manage own zones"
  ON public.repartidor_zones FOR ALL
  USING (auth.uid() = repartidor_id)
  WITH CHECK (auth.uid() = repartidor_id);

-- ============================================
-- PASO 6: CREAR TABLA delivery_personnel
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  assigned_zone_id UUID REFERENCES public.repartidor_zones(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices para delivery_personnel
CREATE INDEX IF NOT EXISTS idx_delivery_personnel_user_id ON public.delivery_personnel(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_personnel_assigned_zone_id ON public.delivery_personnel(assigned_zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_personnel_is_active ON public.delivery_personnel(is_active);

-- RLS para delivery_personnel
ALTER TABLE public.delivery_personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Repartidores can view own personnel record"
  ON public.delivery_personnel FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- PASO 7: CREAR TABLA products
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

-- Política para administradores gestionar productos
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
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

-- ============================================
-- PASO 8: CREAR TABLA delivery_orders
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
  delivery_address UUID REFERENCES public.delivery_addresses(id) ON DELETE SET NULL,
  delivery_date DATE,
  delivery_time_slot VARCHAR(50),
  tracking_number VARCHAR(100),
  notes TEXT,
  assigned_delivery_id UUID REFERENCES public.delivery_personnel(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  assigned_dispatcher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'assigned', 'in_transit', 'delivered', 'failed', 'cancelled')),
  cancellation_reason TEXT,
  zone_id UUID REFERENCES public.repartidor_zones(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_delivery_orders_delivery_address ON public.delivery_orders(delivery_address);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_assigned_delivery_id ON public.delivery_orders(assigned_delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_zone_id ON public.delivery_orders(zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_by ON public.delivery_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_is_active ON public.delivery_orders(is_active);

-- RLS para delivery_orders
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

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

-- Políticas para repartidores y administradores
CREATE POLICY "Repartidores can view assigned orders"
  ON public.delivery_orders FOR SELECT
  USING (
    assigned_delivery_id IN (
      SELECT id FROM public.delivery_personnel WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all orders"
  ON public.delivery_orders FOR ALL
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

-- ============================================
-- PASO 9: CREAR TABLA order_items
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
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

-- RLS para order_items (heredado de delivery_orders)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_orders
      WHERE delivery_orders.id = order_items.order_id
      AND delivery_orders.created_by = auth.uid()
    )
  );

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
-- PASO 10: CREAR TABLA delivery_assignments
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  dispatcher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_transit', 'delivered', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  delivery_notes TEXT,
  delivery_photo_url TEXT,
  client_signature_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id)
);

-- Índices para delivery_assignments
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order_id ON public.delivery_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_dispatcher_id ON public.delivery_assignments(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_assigned_id ON public.delivery_assignments(assigned_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON public.delivery_assignments(status);

-- RLS para delivery_assignments
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Repartidores can manage own assignments"
  ON public.delivery_assignments FOR ALL
  USING (assigned_id = auth.uid())
  WITH CHECK (assigned_id = auth.uid());

CREATE POLICY "Admins can manage all assignments"
  ON public.delivery_assignments FOR ALL
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

-- ============================================
-- PASO 11: CREAR TABLA delivery_tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.delivery_assignments(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accuracy DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para delivery_tracking
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_assignment_id ON public.delivery_tracking(assignment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_timestamp ON public.delivery_tracking(timestamp DESC);

-- RLS para delivery_tracking
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Repartidores can manage own tracking"
  ON public.delivery_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments
      WHERE delivery_assignments.id = delivery_tracking.assignment_id
      AND delivery_assignments.assigned_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments
      WHERE delivery_assignments.id = delivery_tracking.assignment_id
      AND delivery_assignments.assigned_id = auth.uid()
    )
  );

-- ============================================
-- PASO 12: CREAR TABLA delivery_attempts
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.delivery_assignments(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL CHECK (status IN ('failed', 'success', 'rescheduled')),
  reason TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_attempt_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para delivery_attempts
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_assignment_id ON public.delivery_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_status ON public.delivery_attempts(status);

-- RLS para delivery_attempts
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Repartidores can manage own attempts"
  ON public.delivery_attempts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments
      WHERE delivery_assignments.id = delivery_attempts.assignment_id
      AND delivery_assignments.assigned_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments
      WHERE delivery_assignments.id = delivery_attempts.assignment_id
      AND delivery_assignments.assigned_id = auth.uid()
    )
  );

-- ============================================
-- PASO 13: CREAR TABLA user_carts
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
-- PASO 14: CREAR TABLA system_settings
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
  ('currency', '"PEN"', 'Moneda del sistema'),
  ('wholesale_discount_percentage', '10', 'Porcentaje de descuento mayorista'),
  ('min_wholesale_quantity', '50', 'Cantidad mínima para descuento mayorista')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- PASO 15: CREAR TRIGGER PARA user_profiles
-- ============================================

-- Función para crear perfil automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Obtener el role del metadata o usar 'comerciante' por defecto
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'comerciante');

  -- Validar que el role sea uno de los valores permitidos
  IF user_role NOT IN ('admin', 'repartidor', 'comerciante') THEN
    user_role := 'comerciante';
  END IF;

  -- Insertar el perfil
  INSERT INTO public.user_profiles (
    id,
    email,
    name,
    role,
    is_active,
    preferences
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Usuario'),
    user_role,
    true,
    '{"notifications": true, "theme": "auto"}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger para ejecutar la función cuando se crea un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASO 16: CREAR VISTA DE COMPATIBILIDAD (opcional)
-- ============================================
-- Vista para compatibilidad: 'orders' apunta a 'delivery_orders'
-- Esto permite que el código existente que usa 'orders' siga funcionando
-- mientras migras gradualmente a 'delivery_orders'

DROP VIEW IF EXISTS public.orders CASCADE;

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
  -- Campos adicionales que pueden no existir en código antiguo
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

-- Comentario sobre la vista
COMMENT ON VIEW public.orders IS 'Vista de compatibilidad: apunta a delivery_orders. Actualiza el código para usar delivery_orders directamente.';

-- ============================================
-- PASO 17: INSERTAR DATOS DE PRUEBA (OPCIONAL)
-- ============================================

-- Insertar productos de ejemplo
INSERT INTO public.products (name, brand, description, price, wholesale_price, stock, category, weight, image, is_available, min_order_quantity, max_order_quantity, tags)
VALUES
  ('Papas Fritas Clásicas', 'Frito Lay', 'Papas fritas tradicionales con sal', 5.50, 4.50, 1000, 'Snacks', '150g', 'https://example.com/papas-clasicas.jpg', true, 1, 50, ARRAY['papas', 'fritas', 'sal']),
  ('Doritos Nacho Cheese', 'Frito Lay', 'Totopos con sabor a queso nacho', 6.00, 5.00, 800, 'Snacks', '200g', 'https://example.com/doritos-nacho.jpg', true, 1, 40, ARRAY['doritos', 'queso', 'nacho']),
  ('Cheetos Poffs', 'Frito Lay', 'Cheetos inflados con queso', 4.50, 3.80, 600, 'Snacks', '100g', 'https://example.com/cheetos-poffs.jpg', true, 1, 60, ARRAY['cheetos', 'queso', 'inflados']),
  ('Ruffles Original', 'Frito Lay', 'Papas onduladas originales', 5.00, 4.20, 900, 'Snacks', '180g', 'https://example.com/ruffles-original.jpg', true, 1, 45, ARRAY['ruffles', 'onduladas', 'original'])
ON CONFLICT DO NOTHING;

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

-- Verificar vistas creadas
SELECT
  table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '🎉 Base de datos configurada completamente!';
    RAISE NOTICE '✅ Todas las tablas, índices, triggers y políticas RLS están configurados';
    RAISE NOTICE '✅ Vista de compatibilidad "orders" creada para código existente';
    RAISE NOTICE '✅ Productos de ejemplo insertados';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Próximos pasos:';
    RAISE NOTICE '1. Configura las variables de entorno en tus aplicaciones';
    RAISE NOTICE '2. Ejecuta las aplicaciones y prueba el registro de usuarios';
    RAISE NOTICE '3. Verifica que los productos aparezcan en el catálogo';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ NOTA: La vista "orders" es temporal. Actualiza el código para usar "delivery_orders" directamente cuando sea posible.';
END $$;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
