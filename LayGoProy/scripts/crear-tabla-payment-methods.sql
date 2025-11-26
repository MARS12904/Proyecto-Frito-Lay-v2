-- Script para crear la tabla payment_methods
-- Similar a delivery_addresses, pero para métodos de pago

-- ============================================
-- CREAR TABLA payment_methods
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'transfer', 'cash', 'credit')),
  name VARCHAR(255) NOT NULL,
  card_number VARCHAR(19), -- Últimos 4 dígitos o número completo (encriptado)
  expiry_date VARCHAR(7), -- MM/YYYY
  bank VARCHAR(255), -- Para transferencias
  account_number VARCHAR(50), -- Para transferencias
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

-- Comentarios
COMMENT ON TABLE public.payment_methods IS 'Métodos de pago guardados por los usuarios';
COMMENT ON COLUMN public.payment_methods.type IS 'Tipo de método: card, transfer, cash, credit';
COMMENT ON COLUMN public.payment_methods.card_number IS 'Número de tarjeta (últimos 4 dígitos o completo si está encriptado)';
COMMENT ON COLUMN public.payment_methods.expiry_date IS 'Fecha de vencimiento en formato MM/YYYY';
COMMENT ON COLUMN public.payment_methods.bank IS 'Nombre del banco para transferencias';
COMMENT ON COLUMN public.payment_methods.account_number IS 'Número de cuenta para transferencias';


