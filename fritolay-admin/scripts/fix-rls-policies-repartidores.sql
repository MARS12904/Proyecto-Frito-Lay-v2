-- ============================================
-- SCRIPT: Corregir Políticas RLS para Repartidores
-- ============================================
-- Este script corrige las políticas RLS para que los repartidores
-- puedan ver las órdenes asignadas a través de delivery_assignments
-- ============================================

-- 1. Corregir política de delivery_assignments para usar repartidor_id
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Repartidores can manage own assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Repartidores can view own assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Repartidores can update own assignments" ON public.delivery_assignments;

-- Crear nuevas políticas usando repartidor_id
CREATE POLICY "Repartidores can view own assignments"
  ON public.delivery_assignments FOR SELECT
  USING (
    repartidor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'repartidor' AND id = repartidor_id
    )
  );

CREATE POLICY "Repartidores can update own assignments"
  ON public.delivery_assignments FOR UPDATE
  USING (
    repartidor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'repartidor' AND id = repartidor_id
    )
  )
  WITH CHECK (
    repartidor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'repartidor' AND id = repartidor_id
    )
  );

-- 2. Agregar política para que repartidores puedan ver órdenes asignadas
-- Esta política permite a los repartidores ver las órdenes que tienen asignadas
DROP POLICY IF EXISTS "Repartidores can view assigned orders" ON public.delivery_orders;

CREATE POLICY "Repartidores can view assigned orders"
  ON public.delivery_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments
      WHERE delivery_assignments.order_id = delivery_orders.id
      AND delivery_assignments.repartidor_id = auth.uid()
    )
  );

-- 3. Agregar política para que repartidores puedan actualizar delivery_status
DROP POLICY IF EXISTS "Repartidores can update assigned orders status" ON public.delivery_orders;

CREATE POLICY "Repartidores can update assigned orders status"
  ON public.delivery_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments
      WHERE delivery_assignments.order_id = delivery_orders.id
      AND delivery_assignments.repartidor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_assignments
      WHERE delivery_assignments.order_id = delivery_orders.id
      AND delivery_assignments.repartidor_id = auth.uid()
    )
  );

-- 4. Agregar política para que repartidores puedan ver order_items de órdenes asignadas
DROP POLICY IF EXISTS "Repartidores can view assigned order items" ON public.order_items;

CREATE POLICY "Repartidores can view assigned order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_orders
      INNER JOIN public.delivery_assignments 
        ON delivery_assignments.order_id = delivery_orders.id
      WHERE delivery_orders.id = order_items.order_id
      AND delivery_assignments.repartidor_id = auth.uid()
    )
  );

-- 5. Agregar política para que repartidores puedan ver delivery_addresses
-- (necesario si delivery_address es UUID)
DROP POLICY IF EXISTS "Repartidores can view assigned addresses" ON public.delivery_addresses;

CREATE POLICY "Repartidores can view assigned addresses"
  ON public.delivery_addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_orders
      INNER JOIN public.delivery_assignments 
        ON delivery_assignments.order_id = delivery_orders.id
      WHERE delivery_orders.delivery_address::text = delivery_addresses.id::text
      AND delivery_assignments.repartidor_id = auth.uid()
    )
  );

-- 6. Agregar política para que repartidores puedan ver user_profiles de clientes
-- (necesario para mostrar información del cliente)
DROP POLICY IF EXISTS "Repartidores can view customer profiles" ON public.user_profiles;

CREATE POLICY "Repartidores can view customer profiles"
  ON public.user_profiles FOR SELECT
  USING (
    id = auth.uid() -- Pueden ver su propio perfil
    OR EXISTS (
      SELECT 1 FROM public.delivery_orders
      INNER JOIN public.delivery_assignments 
        ON delivery_assignments.order_id = delivery_orders.id
      WHERE delivery_orders.created_by = user_profiles.id
      AND delivery_assignments.repartidor_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('delivery_assignments', 'delivery_orders', 'order_items', 'delivery_addresses', 'user_profiles')
  AND policyname LIKE '%Repartidor%'
ORDER BY tablename, policyname;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- NOTA: Después de ejecutar este script, los repartidores deberían poder:
-- 1. Ver sus asignaciones en delivery_assignments
-- 2. Ver las órdenes asignadas en delivery_orders
-- 3. Actualizar el estado de las órdenes asignadas
-- 4. Ver los items de las órdenes asignadas
-- 5. Ver las direcciones de entrega de las órdenes asignadas
-- 6. Ver los perfiles de los clientes de las órdenes asignadas

