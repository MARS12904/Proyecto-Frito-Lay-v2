-- ============================================
-- SCRIPT PARA ELIMINAR TODOS LOS DATOS CON BACKUP
-- ============================================
-- Este script crea tablas de backup antes de eliminar los datos
-- para que puedas restaurarlos si es necesario.
-- ============================================

-- Crear esquema de backup si no existe
CREATE SCHEMA IF NOT EXISTS backup;

-- ============================================
-- PASO 1: CREAR BACKUPS DE LOS DATOS
-- ============================================

-- Backup de order_items
CREATE TABLE IF NOT EXISTS backup.order_items_backup AS 
SELECT * FROM order_items;

-- Backup de delivery_assignments
CREATE TABLE IF NOT EXISTS backup.delivery_assignments_backup AS 
SELECT * FROM delivery_assignments;

-- Backup de delivery_attempts
CREATE TABLE IF NOT EXISTS backup.delivery_attempts_backup AS 
SELECT * FROM delivery_attempts;

-- Backup de delivery_tracking
CREATE TABLE IF NOT EXISTS backup.delivery_tracking_backup AS 
SELECT * FROM delivery_tracking;

-- Backup de orders
CREATE TABLE IF NOT EXISTS backup.orders_backup AS 
SELECT * FROM orders;

-- Backup de user_carts
CREATE TABLE IF NOT EXISTS backup.user_carts_backup AS 
SELECT * FROM user_carts;

-- Backup de repartidor_zones
CREATE TABLE IF NOT EXISTS backup.repartidor_zones_backup AS 
SELECT * FROM repartidor_zones;

-- Backup de user_profiles
CREATE TABLE IF NOT EXISTS backup.user_profiles_backup AS 
SELECT * FROM user_profiles;

-- Backup de system_settings (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'system_settings') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS backup.system_settings_backup AS SELECT * FROM system_settings';
    END IF;
END $$;

-- ============================================
-- PASO 2: ELIMINAR DATOS ORIGINALES
-- ============================================

-- Desactivar temporalmente las restricciones de claves foráneas
SET session_replication_role = 'replica';

-- Eliminar datos de tablas relacionadas primero
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE delivery_assignments CASCADE;
TRUNCATE TABLE delivery_attempts CASCADE;
TRUNCATE TABLE delivery_tracking CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE user_carts CASCADE;
TRUNCATE TABLE repartidor_zones CASCADE;
TRUNCATE TABLE user_profiles CASCADE;

-- Eliminar system_settings si existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'system_settings') THEN
        EXECUTE 'TRUNCATE TABLE system_settings CASCADE';
    END IF;
END $$;

-- Reactivar las restricciones de claves foráneas
SET session_replication_role = 'origin';

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
    'order_items' as tabla, COUNT(*) as registros FROM order_items
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'user_carts', COUNT(*) FROM user_carts
UNION ALL
SELECT 'delivery_assignments', COUNT(*) FROM delivery_assignments;

-- ============================================
-- RESTAURAR DATOS DESDE BACKUP (si es necesario)
-- ============================================
-- Si necesitas restaurar los datos, ejecuta:
--
-- INSERT INTO order_items SELECT * FROM backup.order_items_backup;
-- INSERT INTO orders SELECT * FROM backup.orders_backup;
-- INSERT INTO user_profiles SELECT * FROM backup.user_profiles_backup;
-- INSERT INTO user_carts SELECT * FROM backup.user_carts_backup;
-- INSERT INTO delivery_assignments SELECT * FROM backup.delivery_assignments_backup;
-- INSERT INTO delivery_attempts SELECT * FROM backup.delivery_attempts_backup;
-- INSERT INTO delivery_tracking SELECT * FROM backup.delivery_tracking_backup;
-- INSERT INTO repartidor_zones SELECT * FROM backup.repartidor_zones_backup;
--
-- Y si restauraste system_settings:
-- INSERT INTO system_settings SELECT * FROM backup.system_settings_backup;

-- ============================================
-- ELIMINAR BACKUPS (cuando ya no los necesites)
-- ============================================
-- DROP SCHEMA backup CASCADE;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================


