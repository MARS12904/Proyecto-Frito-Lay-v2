-- ============================================
-- RECREAR payment_methods - SOLUCIÓN DEFINITIVA
-- ============================================
-- ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos existentes
-- ============================================

-- Eliminar tabla existente completamente
DROP TABLE IF EXISTS public.payment_methods CASCADE;

-- Eliminar función y trigger
DROP FUNCTION IF EXISTS update_payment_methods_updated_at() CASCADE;

-- Crear tabla con estructura CORRECTA (sin brand, sin last4, sin expiry_month)
CREATE TABLE public.payment_methods (
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

-- Crear índices
CREATE INDEX idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_default ON public.payment_methods(is_default);
CREATE INDEX idx_payment_methods_type ON public.payment_methods(type);

-- Configurar RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Eliminar política si existe
DROP POLICY IF EXISTS "Users can manage own payment methods" ON public.payment_methods;

-- Crear política RLS
CREATE POLICY "Users can manage own payment methods"
  ON public.payment_methods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Crear función para updated_at
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Verificar estructura final
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;

-- ✅ Tabla recreada correctamente
-- ✅ Estructura: id, user_id, type, name, card_number, expiry_date, bank, account_number, is_default, created_at, updated_at
-- ✅ NO incluye: brand, last4, expiry_month


