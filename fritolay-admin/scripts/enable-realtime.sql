-- ============================================
-- Script para habilitar Realtime en Supabase
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Habilitar Realtime para la tabla delivery_orders
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_orders;

-- 2. Habilitar Realtime para la tabla delivery_assignments (opcional, para repartidores)
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_assignments;

-- 3. Habilitar Realtime para order_items (opcional)
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- ============================================
-- Verificar que Realtime está habilitado
-- ============================================

-- Ver todas las tablas con Realtime habilitado
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- ============================================
-- Notas:
-- ============================================
-- - Si recibes un error "already exists", la tabla ya tiene Realtime habilitado
-- - Los cambios son inmediatos, no requieren reinicio
-- - Puedes ver el estado de Realtime en el Dashboard de Supabase > Database > Replication
-- ============================================

