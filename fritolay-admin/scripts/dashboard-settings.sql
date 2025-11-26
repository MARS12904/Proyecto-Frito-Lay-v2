-- =====================================================
-- Script: Crear Tabla system_settings para Dashboard
-- Descripción: Crea la tabla de configuración del sistema
-- =====================================================

-- Crear tabla system_settings si no existe
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver y modificar settings
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

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);



