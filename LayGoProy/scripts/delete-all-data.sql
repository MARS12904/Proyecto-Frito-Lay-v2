-- ============================================
-- SCRIPT PARA ELIMINAR TODOS LOS DATOS DE SUPABASE
-- ============================================
-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los datos de las tablas
-- pero mantendrá la estructura de las tablas intacta.
-- 
-- ⚠️ IMPORTANTE: Ejecuta este script solo si estás seguro de que quieres
-- eliminar todos los datos. No se puede deshacer.
--
-- Para ejecutar:
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Abre el SQL Editor
-- 3. Pega este script completo
-- 4. Ejecuta el script
-- ============================================

-- Desactivar temporalmente las restricciones de claves foráneas
SET session_replication_role = 'replica';

-- Eliminar datos de tablas relacionadas primero (orden importante por foreign keys)

-- 1. Eliminar items de pedidos
TRUNCATE TABLE order_items CASCADE;

-- 2. Eliminar asignaciones de repartidores
TRUNCATE TABLE delivery_assignments CASCADE;

-- 3. Eliminar intentos de entrega
TRUNCATE TABLE delivery_attempts CASCADE;

-- 4. Eliminar tracking de entregas
TRUNCATE TABLE delivery_tracking CASCADE;

-- 5. Eliminar pedidos
TRUNCATE TABLE orders CASCADE;

-- 6. Eliminar carritos de usuarios
TRUNCATE TABLE user_carts CASCADE;

-- 7. Eliminar zonas de repartidores
TRUNCATE TABLE repartidor_zones CASCADE;

-- 8. Eliminar perfiles de usuario (pero NO los usuarios de auth.users)
-- Nota: Esto elimina los perfiles pero los usuarios de autenticación permanecen
TRUNCATE TABLE user_profiles CASCADE;

-- 9. Eliminar configuración del sistema (opcional - descomenta si quieres resetear)
-- TRUNCATE TABLE system_settings CASCADE;

-- Reactivar las restricciones de claves foráneas
SET session_replication_role = 'origin';

-- ============================================
-- VERIFICACIÓN: Verificar que las tablas están vacías
-- ============================================
-- Ejecuta estas consultas para verificar que los datos fueron eliminados:

-- SELECT COUNT(*) as total_orders FROM orders;
-- SELECT COUNT(*) as total_order_items FROM order_items;
-- SELECT COUNT(*) as total_user_profiles FROM user_profiles;
-- SELECT COUNT(*) as total_user_carts FROM user_carts;
-- SELECT COUNT(*) as total_delivery_assignments FROM delivery_assignments;

-- ============================================
-- NOTA SOBRE auth.users
-- ============================================
-- Este script NO elimina usuarios de auth.users (autenticación de Supabase).
-- Si también quieres eliminar los usuarios de autenticación, ejecuta:
--
-- DELETE FROM auth.users;
--
-- ⚠️ ADVERTENCIA: Eliminar usuarios de auth.users también eliminará
-- todos los perfiles relacionados automáticamente debido a CASCADE.

-- ============================================
-- RESET DE SECUENCIAS (Opcional)
-- ============================================
-- Si quieres resetear los contadores de IDs autoincrementales:
-- (No aplica para UUIDs, pero útil si tienes campos serial)

-- RESET SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;
-- RESET SEQUENCE IF EXISTS order_items_id_seq RESTART WITH 1;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================


