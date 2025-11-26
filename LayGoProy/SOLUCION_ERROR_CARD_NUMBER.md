# 🔧 Solución: Error "Could not find the 'card_number' column"

## ❌ Error

```
ERROR [paymentMethodsService] ❌ Error saving payment method: {
  "code": "PGRST204",
  "message": "Could not find the 'card_number' column of 'payment_methods' in the schema cache"
}
```

## 🔍 Causa

La tabla `payment_methods` en Supabase **no tiene la columna `card_number`** (y posiblemente otras columnas). Esto puede ocurrir si:

1. La tabla fue creada con un esquema diferente
2. Las columnas fueron eliminadas accidentalmente
3. La tabla no existe o está incompleta

## ✅ Solución

### **Opción 1: Ejecutar Script de Verificación y Corrección (Recomendado)**

Ejecuta en Supabase Dashboard → SQL Editor:

```sql
-- Ejecuta: scripts/verificar-y-corregir-payment-methods.sql
```

Este script:
- ✅ Verifica si la tabla existe
- ✅ Si existe, agrega las columnas faltantes (`card_number`, `expiry_date`, `bank`, `account_number`)
- ✅ Si no existe, crea la tabla completa
- ✅ Configura RLS y triggers

### **Opción 2: Ejecutar Script de Creación Completa**

Si prefieres recrear la tabla desde cero:

```sql
-- Ejecuta: scripts/crear-tabla-payment-methods.sql
```

**⚠️ ADVERTENCIA:** Esto eliminará todos los métodos de pago existentes si la tabla ya existe.

### **Opción 3: Agregar Columnas Manualmente**

Si solo faltan algunas columnas, ejecuta:

```sql
-- Agregar columnas faltantes
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS card_number VARCHAR(19);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(7);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS bank VARCHAR(255);

ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
```

## 📋 Verificación

Después de ejecutar el script, verifica que las columnas existan:

```sql
SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payment_methods'
ORDER BY ordinal_position;
```

**Debes ver:**
- ✅ `id` (UUID)
- ✅ `user_id` (UUID)
- ✅ `type` (VARCHAR)
- ✅ `name` (VARCHAR)
- ✅ `card_number` (VARCHAR) ← **Esta es la que falta**
- ✅ `expiry_date` (VARCHAR)
- ✅ `bank` (VARCHAR)
- ✅ `account_number` (VARCHAR)
- ✅ `is_default` (BOOLEAN)
- ✅ `created_at` (TIMESTAMP)
- ✅ `updated_at` (TIMESTAMP)

## 🔄 Después de Corregir

1. **Recarga la caché de Supabase:**
   - Ve a Supabase Dashboard → Settings → API
   - Haz clic en "Refresh Schema Cache" o espera unos minutos

2. **Prueba nuevamente:**
   - Intenta guardar un método de pago desde la app
   - Debe funcionar correctamente

## 📝 Nota

Si después de ejecutar el script aún aparece el error, puede ser un problema de caché de Supabase. Espera 1-2 minutos y vuelve a intentar.


