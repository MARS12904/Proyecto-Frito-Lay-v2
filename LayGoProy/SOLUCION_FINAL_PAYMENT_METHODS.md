# 🔧 Solución Final: Error al Guardar Métodos de Pago

## ❌ Errores Encontrados

1. **Error 1:** `"Could not find the 'card_number' column"` - ✅ Resuelto
2. **Error 2:** `"null value in column \"brand\" violates not-null constraint"` - ⚠️ Actual

## 🔍 Problema Actual

La tabla `payment_methods` en Supabase tiene una columna `brand` que es **NOT NULL**, pero nuestro código no está enviando ese campo.

## ✅ Solución Completa

### **Paso 1: Ejecutar Script de Corrección**

Ejecuta en **Supabase Dashboard → SQL Editor**:

```sql
-- Ejecuta: scripts/solucion-completa-payment-methods.sql
```

Este script:
- ✅ Verifica la estructura actual de la tabla
- ✅ Hace que `brand` sea nullable (o agrega valor por defecto)
- ✅ Agrega todas las columnas faltantes
- ✅ Corrige constraints y NOT NULL
- ✅ Configura índices y RLS

### **Paso 2: Verificar que Funcionó**

Después de ejecutar el script, verifica:

```sql
SELECT column_name, is_nullable 
FROM information_schema.columns
WHERE table_name = 'payment_methods'
AND column_name = 'brand';
```

**Debe mostrar `is_nullable = 'YES'`**

### **Paso 3: Actualizar Código (Ya Hecho)**

He actualizado `services/paymentMethodsService.ts` para:
- ✅ Intentar enviar `brand: null` (el script SQL lo hace nullable)
- ✅ Si la columna no existe, simplemente no se envía

### **Paso 4: Esperar y Probar**

1. **Espera 1-2 minutos** para que Supabase actualice la caché del esquema
2. **Prueba guardar un método de pago** desde la app
3. Debe funcionar correctamente ahora

## 📋 Estructura Esperada de la Tabla

Después de ejecutar el script, la tabla debe tener:

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `user_id` | UUID | NO | Foreign key a user_profiles |
| `type` | VARCHAR(50) | NO | card, transfer, cash, credit |
| `name` | VARCHAR(255) | NO | Nombre del método |
| `card_number` | VARCHAR(19) | YES | Número de tarjeta |
| `expiry_date` | VARCHAR(7) | YES | Fecha de vencimiento |
| `bank` | VARCHAR(255) | YES | Banco (para transferencias) |
| `account_number` | VARCHAR(50) | YES | Número de cuenta |
| `brand` | VARCHAR(255) | **YES** | Marca (nullable) |
| `is_default` | BOOLEAN | YES | Método por defecto |
| `created_at` | TIMESTAMP | YES | Fecha de creación |
| `updated_at` | TIMESTAMP | YES | Fecha de actualización |

## 🛠️ Si Aún Hay Errores

Si después de ejecutar el script aún hay errores:

1. **Verifica la estructura real:**
   ```sql
   SELECT * FROM information_schema.columns 
   WHERE table_name = 'payment_methods';
   ```

2. **Comparte el resultado** para identificar qué falta

3. **Alternativa:** Ejecuta `scripts/recrear-payment-methods-completo.sql` para empezar desde cero

## ✅ Resumen

1. ✅ Ejecuta `scripts/solucion-completa-payment-methods.sql`
2. ✅ Espera 1-2 minutos
3. ✅ Prueba guardar un método de pago
4. ✅ Debe funcionar correctamente


