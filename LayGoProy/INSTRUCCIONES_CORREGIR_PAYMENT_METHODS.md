# 🔧 Instrucciones: Corregir Tabla payment_methods

## ❌ Error Actual

```
ERROR: column "type" does not exist
```

Esto indica que la tabla `payment_methods` existe pero **no tiene la estructura correcta**.

## ✅ Soluciones

### **Opción 1: Agregar Columnas Faltantes (Recomendado si hay datos)**

Si ya tienes datos en la tabla que quieres conservar:

1. **Ejecuta:** `scripts/agregar-columnas-payment-methods.sql`
   - Este script agrega todas las columnas faltantes
   - No elimina datos existentes
   - Es seguro si ya tienes registros

### **Opción 2: Recrear Tabla Completa (Si no hay datos importantes)**

Si no tienes datos importantes o quieres empezar desde cero:

1. **Ejecuta:** `scripts/recrear-payment-methods-completo.sql`
   - ⚠️ **ADVERTENCIA:** Esto eliminará todos los datos existentes
   - Crea la tabla con la estructura correcta desde cero
   - Más rápido y limpio

## 📋 Pasos Detallados

### **Opción 1: Agregar Columnas**

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Copia y pega el contenido de `scripts/agregar-columnas-payment-methods.sql`
3. Ejecuta el script
4. Verifica que al final muestre todas las columnas:
   - ✅ `id`
   - ✅ `user_id`
   - ✅ `type` ← **Esta es la que falta**
   - ✅ `name`
   - ✅ `card_number`
   - ✅ `expiry_date`
   - ✅ `bank`
   - ✅ `account_number`
   - ✅ `is_default`
   - ✅ `created_at`
   - ✅ `updated_at`

### **Opción 2: Recrear Tabla**

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Copia y pega el contenido de `scripts/recrear-payment-methods-completo.sql`
3. ⚠️ **Lee la advertencia** - esto eliminará todos los datos
4. Ejecuta el script
5. Verifica que muestre todas las columnas al final

## 🔄 Después de Ejecutar

1. **Espera 1-2 minutos** para que Supabase actualice la caché del esquema
2. **Prueba guardar un método de pago** desde la app
3. Debe funcionar correctamente ahora

## 🔍 Verificación

Después de ejecutar cualquiera de los scripts, verifica:

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'payment_methods'
ORDER BY ordinal_position;
```

**Debes ver todas las columnas listadas arriba.**

## 💡 Recomendación

- Si **NO tienes datos importantes** → Usa **Opción 2** (más rápido)
- Si **tienes datos que quieres conservar** → Usa **Opción 1** (más seguro)


