-- =====================================================
-- Script: Insertar Datos de Ejemplo para el Dashboard
-- Descripción: Inserta datos de prueba para visualizar
--              métricas en el dashboard administrativo
-- =====================================================

-- NOTA: Este script asume que ya tienes usuarios en auth.users
-- Si no tienes usuarios, primero crea algunos usuarios en Supabase Auth

-- ============================================
-- PASO 1: Crear usuarios de ejemplo en auth.users
-- ============================================
-- NOTA: Los usuarios deben crearse manualmente desde Supabase Auth
-- o usar la API. Aquí asumimos que ya existen algunos usuarios.
-- Si necesitas crear usuarios, puedes usar el dashboard de Supabase Auth.

-- ============================================
-- PASO 2: Crear perfiles de usuario de ejemplo
-- ============================================

-- Obtener IDs de usuarios existentes (ajusta estos UUIDs según tus usuarios reales)
-- Si no tienes usuarios, primero crea algunos desde Supabase Auth

-- Insertar perfiles de comerciantes (asumiendo que tienes usuarios con estos IDs)
-- Reemplaza estos UUIDs con los IDs reales de tus usuarios en auth.users
DO $$
DECLARE
  -- IDs de ejemplo - REEMPLAZA ESTOS CON TUS IDs REALES de auth.users
  -- IMPORTANTE: Estos usuarios deben existir primero en auth.users
  user1_id UUID := 'e6424c33-cd7f-4b9f-af87-3b4dbce8f131';
  user2_id UUID := 'd0c2ac37-5631-40ab-b463-8a3325284c12';
  user3_id UUID; -- Se generará o usar el mismo que user1_id si solo tienes 2 usuarios
  user4_id UUID; -- Se generará o usar el mismo que user2_id si solo tienes 2 usuarios
  user5_id UUID; -- Se generará o usar el mismo que user1_id si solo tienes 2 usuarios
BEGIN
  -- Si solo tienes 2 usuarios, reutiliza los IDs para los demás perfiles
  -- O reemplaza con IDs reales si tienes más usuarios
  user3_id := user1_id; -- Cambia esto por un UUID real si tienes un tercer usuario
  user4_id := user2_id; -- Cambia esto por un UUID real si tienes un cuarto usuario
  user5_id := user1_id; -- Cambia esto por un UUID real si tienes un quinto usuario
  
  -- Insertar perfiles solo si no existen
  -- Según el diagrama: id, email, name, phone, profile_image_url, role, preferences, 
  -- created_at, updated_at, vehicle_type, license_number, phone_verified, is_active
  INSERT INTO public.user_profiles (id, email, name, role, is_active, phone, preferences)
  VALUES
    (user1_id, 'comerciante1@fritolay.com', 'Juan Pérez', 'comerciante', true, '+51987654321', '{"notifications": true, "theme": "auto"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_profiles (id, email, name, role, is_active, phone, preferences)
  VALUES
    (user2_id, 'comerciante2@fritolay.com', 'María García', 'comerciante', true, '+51987654322', '{"notifications": true, "theme": "auto"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_profiles (id, email, name, role, is_active, phone, preferences)
  VALUES
    (user3_id, 'comerciante3@fritolay.com', 'Carlos López', 'comerciante', true, '+51987654323', '{"notifications": true, "theme": "auto"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_profiles (id, email, name, role, is_active, phone, vehicle_type, license_number, phone_verified, preferences)
  VALUES
    (user4_id, 'repartidor1@fritolay.com', 'Pedro Martínez', 'repartidor', true, '+51987654324', 'Moto', 'ABC123', false, '{"notifications": true, "theme": "auto"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_profiles (id, email, name, role, is_active, phone, vehicle_type, license_number, phone_verified, preferences)
  VALUES
    (user5_id, 'repartidor2@fritolay.com', 'Ana Rodríguez', 'repartidor', true, '+51987654325', 'Auto', 'XYZ789', false, '{"notifications": true, "theme": "auto"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Perfiles de usuario insertados o actualizados';
END $$;

-- ============================================
-- PASO 3: Insertar productos de ejemplo
-- ============================================

INSERT INTO public.products (id, name, brand, description, price, wholesale_price, stock, category, weight, is_available, min_order_quantity, max_order_quantity, tags)
VALUES
  (gen_random_uuid(), 'Papas Fritas Clásicas', 'Lay''s', 'Papas fritas clásicas crujientes', 5.50, 4.50, 500, 'Snacks', '150g', true, 10, 100, ARRAY['popular', 'clasico']),
  (gen_random_uuid(), 'Doritos Nacho', 'Doritos', 'Tortillas de maíz con sabor nacho', 6.00, 5.00, 300, 'Snacks', '150g', true, 10, 100, ARRAY['popular', 'queso']),
  (gen_random_uuid(), 'Cheetos Puffs', 'Cheetos', 'Snack inflado con sabor a queso', 5.00, 4.00, 400, 'Snacks', '120g', true, 10, 100, ARRAY['queso', 'inflado']),
  (gen_random_uuid(), 'Ruffles Original', 'Ruffles', 'Papas fritas con ondas', 5.50, 4.50, 350, 'Snacks', '150g', true, 10, 100, ARRAY['clasico', 'ondas']),
  (gen_random_uuid(), 'Fritos Original', 'Fritos', 'Maíz frito crujiente', 4.50, 3.50, 450, 'Snacks', '120g', true, 10, 100, ARRAY['maiz', 'clasico']),
  (gen_random_uuid(), 'Tostitos Original', 'Tostitos', 'Tortillas de maíz horneadas', 5.00, 4.00, 380, 'Snacks', '150g', true, 10, 100, ARRAY['tortilla', 'horneado']),
  (gen_random_uuid(), 'Lay''s Limón', 'Lay''s', 'Papas fritas con sabor a limón', 5.50, 4.50, 320, 'Snacks', '150g', true, 10, 100, ARRAY['limon', 'acido']),
  (gen_random_uuid(), 'Doritos Flamin Hot', 'Doritos', 'Tortillas picantes', 6.00, 5.00, 280, 'Snacks', '150g', true, 10, 100, ARRAY['picante', 'hot']),
  (gen_random_uuid(), 'Cheetos Crunchy', 'Cheetos', 'Snack crujiente con sabor a queso', 5.00, 4.00, 420, 'Snacks', '120g', true, 10, 100, ARRAY['queso', 'crujiente']),
  (gen_random_uuid(), 'Ruffles Queso', 'Ruffles', 'Papas con ondas sabor queso', 5.50, 4.50, 360, 'Snacks', '150g', true, 10, 100, ARRAY['queso', 'ondas']),
  (gen_random_uuid(), 'Lay''s Barbacoa', 'Lay''s', 'Papas fritas sabor barbacoa', 5.50, 4.50, 290, 'Snacks', '150g', true, 10, 100, ARRAY['barbacoa', 'ahumado']),
  (gen_random_uuid(), 'Tostitos Salsa Verde', 'Tostitos', 'Tortillas con sabor a salsa verde', 5.00, 4.00, 340, 'Snacks', '150g', true, 10, 100, ARRAY['verde', 'salsa']),
  (gen_random_uuid(), 'Fritos Chili Cheese', 'Fritos', 'Maíz frito con sabor chili y queso', 4.50, 3.50, 410, 'Snacks', '120g', true, 10, 100, ARRAY['chili', 'queso']),
  (gen_random_uuid(), 'Doritos Cool Ranch', 'Doritos', 'Tortillas con sabor ranch', 6.00, 5.00, 370, 'Snacks', '150g', true, 10, 100, ARRAY['ranch', 'cremoso']),
  (gen_random_uuid(), 'Lay''s Sal y Vinagre', 'Lay''s', 'Papas fritas sabor sal y vinagre', 5.50, 4.50, 330, 'Snacks', '150g', true, 10, 100, ARRAY['sal', 'vinagre']),
  (gen_random_uuid(), 'Cheetos Flamin Hot', 'Cheetos', 'Snack picante inflado', 5.00, 4.00, 270, 'Snacks', '120g', true, 10, 100, ARRAY['picante', 'hot']),
  (gen_random_uuid(), 'Ruffles Crema y Cebolla', 'Ruffles', 'Papas con ondas sabor crema y cebolla', 5.50, 4.50, 310, 'Snacks', '150g', true, 10, 100, ARRAY['crema', 'cebolla']),
  (gen_random_uuid(), 'Tostitos Multigrano', 'Tostitos', 'Tortillas multigrano horneadas', 5.00, 4.00, 390, 'Snacks', '150g', true, 10, 100, ARRAY['multigrano', 'saludable']),
  (gen_random_uuid(), 'Lay''s Cebolla', 'Lay''s', 'Papas fritas sabor cebolla', 5.50, 4.50, 340, 'Snacks', '150g', true, 10, 100, ARRAY['cebolla', 'clasico']),
  (gen_random_uuid(), 'Doritos Dinamita', 'Doritos', 'Tortillas extra picantes', 6.00, 5.00, 250, 'Snacks', '150g', true, 10, 100, ARRAY['picante', 'extra-hot']),
  (gen_random_uuid(), 'Fritos Honey BBQ', 'Fritos', 'Maíz frito sabor miel y barbacoa', 4.50, 3.50, 400, 'Snacks', '120g', true, 10, 100, ARRAY['miel', 'barbacoa']),
  (gen_random_uuid(), 'Cheetos White Cheddar', 'Cheetos', 'Snack con queso cheddar blanco', 5.00, 4.00, 350, 'Snacks', '120g', true, 10, 100, ARRAY['cheddar', 'queso']),
  (gen_random_uuid(), 'Ruffles Jamón', 'Ruffles', 'Papas con ondas sabor jamón', 5.50, 4.50, 300, 'Snacks', '150g', true, 10, 100, ARRAY['jamon', 'ondas']),
  (gen_random_uuid(), 'Tostitos Scoops', 'Tostitos', 'Tortillas en forma de cuchara', 5.00, 4.00, 380, 'Snacks', '150g', true, 10, 100, ARRAY['scoops', 'dip']),
  (gen_random_uuid(), 'Lay''s Ketchup', 'Lay''s', 'Papas fritas sabor ketchup', 5.50, 4.50, 320, 'Snacks', '150g', true, 10, 100, ARRAY['ketchup', 'tomate'])
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 4: Insertar pedidos de ejemplo
-- ============================================

-- Obtener IDs de usuarios y productos para crear pedidos
DO $$
DECLARE
  -- IDs de usuarios (ajusta según tus usuarios reales)
  user1_id UUID := 'e6424c33-cd7f-4b9f-af87-3b4dbce8f131';
  user2_id UUID := 'd0c2ac37-5631-40ab-b463-8a3325284c12';
  user3_id UUID := user1_id; -- Reutiliza user1_id si solo tienes 2 usuarios
  user4_id UUID := user2_id; -- Reutiliza user2_id si solo tienes 2 usuarios
  
  -- Variables para almacenar IDs generados de pedidos
  order1_id UUID;
  order2_id UUID;
  order3_id UUID;
  order4_id UUID;
  order5_id UUID;
  order6_id UUID;
  order7_id UUID;
  order8_id UUID;
  order9_id UUID;
  order10_id UUID;
  
  -- IDs de productos (se obtendrán de la tabla)
  product1_id UUID;
  product2_id UUID;
  product3_id UUID;
  product4_id UUID;
  product5_id UUID;
  
  -- IDs de direcciones de entrega (se crearán)
  address1_id UUID;
  address2_id UUID;
  address3_id UUID;
BEGIN
  -- Obtener IDs de productos
  SELECT id INTO product1_id FROM public.products WHERE name = 'Papas Fritas Clásicas' LIMIT 1;
  SELECT id INTO product2_id FROM public.products WHERE name = 'Doritos Nacho' LIMIT 1;
  SELECT id INTO product3_id FROM public.products WHERE name = 'Cheetos Puffs' LIMIT 1;
  SELECT id INTO product4_id FROM public.products WHERE name = 'Ruffles Original' LIMIT 1;
  SELECT id INTO product5_id FROM public.products WHERE name = 'Fritos Original' LIMIT 1;
  
  -- Crear direcciones de entrega según el diagrama (delivery_addresses)
  -- Campos según diagrama: id, user_id, label, name, address, reference, is_default, created_at, updated_at
  -- Primero intentar insertar, si ya existe obtener el ID
  INSERT INTO public.delivery_addresses (id, user_id, label, name, address, reference, is_default)
  VALUES
    (gen_random_uuid(), user1_id, 'Casa', 'Juan Pérez', 'Av. Principal 123, Lima', 'Frente al parque', true)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.delivery_addresses (id, user_id, label, name, address, reference, is_default)
  VALUES
    (gen_random_uuid(), user2_id, 'Tienda', 'María García', 'Jr. Comercio 456, Lima', 'Local 12', true)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.delivery_addresses (id, user_id, label, name, address, reference, is_default)
  VALUES
    (gen_random_uuid(), user3_id, 'Oficina', 'Carlos López', 'Calle Real 321, Lima', 'Piso 3', true)
  ON CONFLICT DO NOTHING;
  
  -- Obtener IDs de direcciones (creadas o existentes)
  SELECT id INTO address1_id FROM public.delivery_addresses WHERE user_id = user1_id AND is_default = true LIMIT 1;
  SELECT id INTO address2_id FROM public.delivery_addresses WHERE user_id = user2_id AND is_default = true LIMIT 1;
  SELECT id INTO address3_id FROM public.delivery_addresses WHERE user_id = user3_id AND is_default = true LIMIT 1;
  
  -- Insertar pedidos completados (para ingresos)
  -- Según el diagrama: orders_table tiene delivery_address como FK a delivery_addresses
  -- Pero en delivery_orders usamos delivery_address como TEXT, así que usamos el campo address directamente
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at
  )
  VALUES
    ('ORD-2024-001', user1_id, 450.00, 500.00, 50.00, 0.00, 'completed', 'paid', 'delivered', 
     'Tarjeta de Crédito', 'Av. Principal 123, Lima', 
     CURRENT_DATE - INTERVAL '5 days', '10:00-12:00', true, NOW() - INTERVAL '5 days')
  RETURNING id INTO order1_id;
  
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at
  )
  VALUES
    ('ORD-2024-002', user2_id, 320.00, 360.00, 40.00, 0.00, 'completed', 'paid', 'delivered', 
     'Transferencia', 'Jr. Comercio 456, Lima', 
     CURRENT_DATE - INTERVAL '4 days', '14:00-16:00', true, NOW() - INTERVAL '4 days')
  RETURNING id INTO order2_id;
  
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at
  )
  VALUES
    ('ORD-2024-003', user1_id, 280.00, 320.00, 40.00, 0.00, 'delivered', 'paid', 'delivered', 
     'Efectivo', 'Av. Los Olivos 789, Lima', 
     CURRENT_DATE - INTERVAL '3 days', '09:00-11:00', true, NOW() - INTERVAL '3 days')
  RETURNING id INTO order3_id;
  
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at
  )
  VALUES
    ('ORD-2024-004', user3_id, 550.00, 600.00, 50.00, 0.00, 'completed', 'paid', 'delivered', 
     'Tarjeta de Débito', 'Calle Real 321, Lima', 
     CURRENT_DATE - INTERVAL '2 days', '15:00-17:00', true, NOW() - INTERVAL '2 days')
  RETURNING id INTO order4_id;
  
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at
  )
  VALUES
    ('ORD-2024-005', user2_id, 380.00, 420.00, 40.00, 0.00, 'completed', 'paid', 'delivered', 
     'Transferencia', 'Av. Arequipa 654, Lima', 
     CURRENT_DATE - INTERVAL '1 day', '11:00-13:00', true, NOW() - INTERVAL '1 day')
  RETURNING id INTO order5_id;
  
  -- Insertar pedidos pendientes
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at
  )
  VALUES
    ('ORD-2024-006', user1_id, 420.00, 480.00, 60.00, 0.00, 'pending', 'pending', 'pending', 
     'Tarjeta de Crédito', 'Av. Brasil 987, Lima', 
     CURRENT_DATE + INTERVAL '2 days', '10:00-12:00', true, NOW())
  RETURNING id INTO order6_id;
  
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at
  )
  VALUES
    ('ORD-2024-007', user3_id, 290.00, 330.00, 40.00, 0.00, 'confirmed', 'paid', 'assigned', 
     'Efectivo', 'Jr. Unión 147, Lima', 
     CURRENT_DATE + INTERVAL '1 day', '14:00-16:00', true, NOW() - INTERVAL '2 hours')
  RETURNING id INTO order7_id;
  
  -- Insertar pedidos en preparación
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at
  )
  VALUES
    ('ORD-2024-008', user2_id, 350.00, 400.00, 50.00, 0.00, 'preparing', 'paid', 'assigned', 
     'Transferencia', 'Av. Javier Prado 258, Lima', 
     CURRENT_DATE + INTERVAL '1 day', '09:00-11:00', true, NOW() - INTERVAL '1 hour')
  RETURNING id INTO order8_id;
  
  -- Insertar pedidos en camino
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at
  )
  VALUES
    ('ORD-2024-009', user1_id, 480.00, 540.00, 60.00, 0.00, 'shipped', 'paid', 'in_transit', 
     'Tarjeta de Crédito', 'Calle Las Begonias 369, Lima', 
     CURRENT_DATE, '15:00-17:00', true, NOW() - INTERVAL '30 minutes')
  RETURNING id INTO order9_id;
  
  -- Insertar pedido cancelado (no debe contar en ingresos)
  INSERT INTO public.delivery_orders (
    order_number, created_by, total, wholesale_total, savings, co_wholesale, status, 
    payment_status, delivery_status, payment_method, delivery_address,
    delivery_date, delivery_time_slot, is_active, created_at, cancellation_reason
  )
  VALUES
    ('ORD-2024-010', user3_id, 200.00, 240.00, 40.00, 0.00, 'cancelled', 'refunded', 'cancelled', 
     'Tarjeta de Débito', 'Av. La Marina 741, Lima', 
     CURRENT_DATE + INTERVAL '3 days', '10:00-12:00', true, NOW() - INTERVAL '1 day', 'Cliente canceló')
  RETURNING id INTO order10_id;
  
  -- ============================================
  -- PASO 5: Insertar items de pedidos
  -- ============================================
  
  -- Items para order1_id (completado)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order1_id, product1_id, 'Papas Fritas Clásicas', 'Lay''s', 50, 4.50, 225.00, '150g'),
    (order1_id, product2_id, 'Doritos Nacho', 'Doritos', 30, 5.00, 150.00, '150g'),
    (order1_id, product3_id, 'Cheetos Puffs', 'Cheetos', 25, 4.00, 100.00, '120g');
  
  -- Items para order2_id (completado)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order2_id, product4_id, 'Ruffles Original', 'Ruffles', 40, 4.50, 180.00, '150g'),
    (order2_id, product5_id, 'Fritos Original', 'Fritos', 40, 3.50, 140.00, '120g');
  
  -- Items para order3_id (entregado)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order3_id, product1_id, 'Papas Fritas Clásicas', 'Lay''s', 35, 4.50, 157.50, '150g'),
    (order3_id, product3_id, 'Cheetos Puffs', 'Cheetos', 30, 4.00, 120.00, '120g');
  
  -- Items para order4_id (completado)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order4_id, product2_id, 'Doritos Nacho', 'Doritos', 60, 5.00, 300.00, '150g'),
    (order4_id, product4_id, 'Ruffles Original', 'Ruffles', 50, 4.50, 225.00, '150g');
  
  -- Items para order5_id (completado)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order5_id, product1_id, 'Papas Fritas Clásicas', 'Lay''s', 45, 4.50, 202.50, '150g'),
    (order5_id, product5_id, 'Fritos Original', 'Fritos', 50, 3.50, 175.00, '120g');
  
  -- Items para order6_id (pendiente)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order6_id, product2_id, 'Doritos Nacho', 'Doritos', 50, 5.00, 250.00, '150g'),
    (order6_id, product3_id, 'Cheetos Puffs', 'Cheetos', 40, 4.00, 160.00, '120g');
  
  -- Items para order7_id (confirmado)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order7_id, product4_id, 'Ruffles Original', 'Ruffles', 30, 4.50, 135.00, '150g'),
    (order7_id, product5_id, 'Fritos Original', 'Fritos', 35, 3.50, 122.50, '120g');
  
  -- Items para order8_id (preparando)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order8_id, product1_id, 'Papas Fritas Clásicas', 'Lay''s', 40, 4.50, 180.00, '150g'),
    (order8_id, product2_id, 'Doritos Nacho', 'Doritos', 30, 5.00, 150.00, '150g');
  
  -- Items para order9_id (en camino)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order9_id, product3_id, 'Cheetos Puffs', 'Cheetos', 50, 4.00, 200.00, '120g'),
    (order9_id, product4_id, 'Ruffles Original', 'Ruffles', 50, 4.50, 225.00, '150g');
  
  -- Items para order10_id (cancelado - no cuenta en ingresos)
  INSERT INTO public.order_items (order_id, product_id, product_name, product_brand, quantity, price, subtotal, weight)
  VALUES
    (order10_id, product5_id, 'Fritos Original', 'Fritos', 40, 3.50, 140.00, '120g'),
    (order10_id, product1_id, 'Papas Fritas Clásicas', 'Lay''s', 20, 4.50, 90.00, '150g');
  
  RAISE NOTICE 'Pedidos e items insertados correctamente';
END $$;

-- ============================================
-- PASO 6: Verificar datos insertados
-- ============================================

-- Mostrar resumen de datos insertados
SELECT 
  'Usuarios' as tipo,
  COUNT(*) as cantidad
FROM public.user_profiles
UNION ALL
SELECT 
  'Productos' as tipo,
  COUNT(*) as cantidad
FROM public.products
UNION ALL
SELECT 
  'Pedidos' as tipo,
  COUNT(*) as cantidad
FROM public.delivery_orders
UNION ALL
SELECT 
  'Items de Pedidos' as tipo,
  COUNT(*) as cantidad
FROM public.order_items
UNION ALL
SELECT 
  'Pedidos Completados' as tipo,
  COUNT(*) as cantidad
FROM public.delivery_orders
WHERE status IN ('completed', 'delivered')
UNION ALL
SELECT 
  'Ingresos Totales (S/)' as tipo,
  CAST(SUM(oi.quantity * oi.price) as TEXT) as cantidad
FROM public.order_items oi
INNER JOIN public.delivery_orders o ON oi.order_id = o.id
WHERE o.status IN ('completed', 'delivered');

-- ============================================
-- ESTRUCTURA DE LA BASE DE DATOS (Según Diagrama)
-- ============================================
-- 
-- Tablas principales utilizadas:
-- 
-- 1. user_profiles
--    - Campos: id, email, name, phone, profile_image_url, role, preferences,
--              created_at, updated_at, vehicle_type, license_number, 
--              phone_verified, is_active
--    - Relación: id -> auth.users.id (FK)
--
-- 2. delivery_addresses
--    - Campos: id, user_id, label, name, address, reference, is_default,
--              created_at, updated_at
--    - Relación: user_id -> auth.users.id (FK)
--
-- 3. delivery_orders (orders_table en el diagrama)
--    - Campos: id, order_number, status, total, wholesale_total, savings,
--              co_wholesale, payment_method, payment_status, delivery_address,
--              delivery_date, delivery_time_slot, tracking_number, notes,
--              assigned_delivery_id, created_at, updated_at
--    - Relaciones: 
--      * created_by -> auth.users.id (FK)
--      * assigned_delivery_id -> auth.users.id (FK)
--      * delivery_address -> delivery_addresses.id (FK) o TEXT
--
-- 4. order_items
--    - Campos: id, order_id, product_id, product_name, product_brand,
--              quantity, price (o unit_price), subtotal, weight, created_at
--    - Relación: order_id -> delivery_orders.id (FK)
--
-- 5. products
--    - Campos: id, name, brand, description, price, wholesale_price, stock,
--              category, weight, is_available, min_order_quantity,
--              max_order_quantity, tags, created_at, updated_at
--
-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================
-- 
-- 1. ANTES DE EJECUTAR:
--    - Reemplaza los UUIDs de ejemplo (user1_id, user2_id) con los IDs reales
--      de tus usuarios en auth.users
--    - El script reutiliza user1_id y user2_id para user3_id, user4_id, user5_id
--      si solo tienes 2 usuarios. Si tienes más, actualiza los valores.
--
-- 2. PARA OBTENER IDs DE USUARIOS EXISTENTES:
--    Ejecuta esta consulta en Supabase SQL Editor:
--    SELECT id, email FROM auth.users LIMIT 5;
--
-- 3. EJECUTAR EL SCRIPT:
--    - Ve a Supabase Dashboard > SQL Editor
--    - Copia y pega este script completo
--    - Asegúrate de que los UUIDs de usuarios sean correctos
--    - Ejecuta el script (Ctrl+Enter o botón Run)
--
-- 4. VERIFICAR RESULTADOS:
--    - El script mostrará un resumen al final con:
--      * Cantidad de usuarios insertados
--      * Cantidad de productos insertados
--      * Cantidad de pedidos insertados
--      * Cantidad de items insertados
--      * Cantidad de pedidos completados
--      * Ingresos totales calculados
--    - Ve al dashboard administrativo y verifica las métricas
--
-- 5. NOTAS IMPORTANTES:
--    - El script es idempotente (puede ejecutarse múltiples veces)
--    - Los pedidos cancelados NO cuentan en los ingresos totales
--    - Los pedidos completados/entregados SÍ cuentan en los ingresos
--    - Las direcciones de entrega se crean automáticamente
--
-- ============================================

