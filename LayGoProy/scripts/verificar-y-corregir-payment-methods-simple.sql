-- ============================================
-- VERIFICAR Y CORREGIR TABLA payment_methods
-- Versión simplificada sin bloques DO complejos
-- ============================================

-- Paso 1: Verificar estructura actual
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;

-- Paso 2: Crear la tabla si no existe
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

-- Paso 3: Agregar columnas faltantes (si la tabla ya existía)
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS card_number VARCHAR(19);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(7);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS bank VARCHAR(255);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);

-- Paso 4: Crear índices
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON public.payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON public.payment_methods(type);

-- Paso 5: Configurar RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Eliminar política si existe y recrearla
DROP POLICY IF EXISTS "Users can manage own payment methods" ON public.payment_methods;

CREATE POLICY "Users can manage own payment methods"
  ON public.payment_methods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Paso 6: Crear función y trigger para updated_at
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_methods_updated_at ON public.payment_methods;

CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Paso 7: Verificar estructura final
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;

-- ✅ La tabla payment_methods está lista para usar


