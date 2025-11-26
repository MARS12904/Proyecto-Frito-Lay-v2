# 🚨 SOLUCIÓN URGENTE - Ejecutar AHORA

## ⚡ Pasos Inmediatos

### **Paso 1: Ejecutar Script SQL (1 minuto)**

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Copia y pega este código:

```sql
-- Hacer nullable brand
ALTER TABLE public.payment_methods ALTER COLUMN brand DROP NOT NULL;

-- Hacer nullable last4  
ALTER TABLE public.payment_methods ALTER COLUMN last4 DROP NOT NULL;
```

3. **Ejecuta** (Run)
4. Debe mostrar "Success"

### **Paso 2: Esperar 30 segundos**

Espera 30 segundos para que Supabase actualice la caché.

### **Paso 3: Probar**

Intenta guardar un método de pago desde la app. **Debe funcionar ahora.**

## ✅ Código Ya Actualizado

El código ya está actualizado para:
- ✅ Enviar `brand` con el nombre del método
- ✅ Enviar `last4` con los últimos 4 dígitos de la tarjeta
- ✅ Manejar errores correctamente

## 🔄 Si Aún No Funciona

Si después de ejecutar el script aún hay errores, ejecuta esto:

```sql
-- Recrear tabla completa (elimina datos existentes)
DROP TABLE IF EXISTS public.payment_methods CASCADE;

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

CREATE INDEX idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_default ON public.payment_methods(is_default);
CREATE INDEX idx_payment_methods_type ON public.payment_methods(type);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment methods"
  ON public.payment_methods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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
```

## 📝 Resumen

1. ✅ Ejecuta el script SQL de arriba (2 líneas)
2. ✅ Espera 30 segundos
3. ✅ Prueba guardar una tarjeta
4. ✅ Debe funcionar


