# 📊 Script para Insertar Datos de Ejemplo en el Dashboard

## 📋 Descripción

Este script inserta datos de ejemplo (usuarios, productos, pedidos e items) para que puedas visualizar métricas en el dashboard administrativo.

## ⚠️ IMPORTANTE: Antes de Ejecutar

### Paso 1: Obtener IDs de Usuarios Reales

El script necesita IDs reales de usuarios que existan en `auth.users`. Para obtenerlos:

1. Ve a Supabase Dashboard > Authentication > Users
2. O ejecuta esta consulta en SQL Editor:
   ```sql
   SELECT id, email FROM auth.users LIMIT 5;
   ```
3. Copia los IDs que necesites

### Paso 2: Actualizar el Script

Abre el archivo `insert-dashboard-sample-data.sql` y reemplaza estos UUIDs de ejemplo:

```sql
-- REEMPLAZA ESTOS CON TUS IDs REALES
user1_id UUID := 'e6424c33-cd7f-4b9f-af87-3b4dbce8f131';
user2_id UUID := 'd0c2ac37-5631-40ab-b463-8a3325284c12';
user3_id UUID := '00000000-0000-0000-0000-000000000003';
```

Con los IDs reales de tus usuarios.

## 🚀 Cómo Ejecutar el Script

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral
4. Haz clic en **"New query"**
5. Copia y pega el contenido completo de `insert-dashboard-sample-data.sql`
6. **IMPORTANTE**: Reemplaza los UUIDs de ejemplo con tus IDs reales
7. Haz clic en **"Run"** o presiona `Ctrl+Enter`

### Opción 2: Si No Tienes Usuarios

Si aún no tienes usuarios creados, primero créalos:

1. Ve a Supabase Dashboard > Authentication > Users
2. Haz clic en **"Add user"** > **"Create new user"**
3. Crea al menos 3 usuarios con emails como:
   - `comerciante1@fritolay.com`
   - `comerciante2@fritolay.com`
   - `repartidor1@fritolay.com`
4. Copia los IDs generados
5. Actualiza el script con estos IDs
6. Ejecuta el script

## 📊 Qué Datos Se Insertan

El script inserta:

### 1. Perfiles de Usuario (5 usuarios)
- 3 Comerciantes
- 2 Repartidores

### 2. Productos (25 productos)
- Variedad de snacks Frito-Lay (Lay's, Doritos, Cheetos, etc.)
- Con precios mayoristas y minoristas
- Con stock disponible

### 3. Pedidos (10 pedidos)
- 5 pedidos completados/entregados (para ingresos)
- 2 pedidos pendientes
- 1 pedido confirmado
- 1 pedido en preparación
- 1 pedido en camino
- 1 pedido cancelado (no cuenta en ingresos)

### 4. Items de Pedidos
- Cada pedido tiene 2-3 items
- Con cantidades, precios y subtotales

## ✅ Verificar que Funcionó

Después de ejecutar el script, verifica:

1. **En el Dashboard Administrativo:**
   - Total Usuarios: Debería mostrar al menos 5
   - Total Pedidos: Debería mostrar 10 (o 9 si excluye cancelados)
   - Productos: Debería mostrar 25
   - Ingresos Totales: Debería mostrar un monto calculado desde los pedidos completados

2. **En Supabase:**
   ```sql
   -- Verificar usuarios
   SELECT COUNT(*) FROM public.user_profiles;
   
   -- Verificar productos
   SELECT COUNT(*) FROM public.products;
   
   -- Verificar pedidos
   SELECT COUNT(*) FROM public.delivery_orders;
   
   -- Verificar items
   SELECT COUNT(*) FROM public.order_items;
   
   -- Ver ingresos totales
   SELECT SUM(oi.quantity * oi.price) as total_ingresos
   FROM public.order_items oi
   INNER JOIN public.delivery_orders o ON oi.order_id = o.id
   WHERE o.status IN ('completed', 'delivered');
   ```

## 🔧 Solución de Problemas

### Error: "violates foreign key constraint"

**Causa**: Los UUIDs de usuarios no existen en `auth.users`

**Solución**: 
1. Crea usuarios primero en Supabase Auth
2. Obtén sus IDs
3. Actualiza el script con los IDs reales

### Error: "duplicate key value"

**Causa**: Los datos ya fueron insertados anteriormente

**Solución**: 
- El script usa `ON CONFLICT DO NOTHING`, así que es seguro ejecutarlo múltiples veces
- Si quieres limpiar y empezar de nuevo, ejecuta:
  ```sql
  DELETE FROM public.order_items;
  DELETE FROM public.delivery_orders;
  DELETE FROM public.products WHERE name LIKE '%Lay%' OR name LIKE '%Doritos%';
  ```

### No se muestran datos en el Dashboard

**Causa**: Los pedidos no tienen status 'completed' o 'delivered'

**Solución**: 
- Verifica que los pedidos completados tengan `status IN ('completed', 'delivered')`
- Verifica que los items estén correctamente vinculados a los pedidos

## 📝 Notas Adicionales

- El script es **idempotente**: puedes ejecutarlo múltiples veces sin problemas
- Los datos son de **ejemplo**: ajusta cantidades y precios según necesites
- Los pedidos tienen fechas distribuidas en los últimos días para simular actividad real
- El pedido cancelado no cuenta en los ingresos totales (como debe ser)

## 🎯 Próximos Pasos

Después de insertar los datos:

1. Ve al dashboard administrativo
2. Verifica que todas las métricas se muestren correctamente
3. Navega a las secciones de:
   - Pedidos: Deberías ver los 10 pedidos
   - Usuarios: Deberías ver los 5 usuarios
   - Productos: Deberías ver los 25 productos
   - Reportes: Deberías ver gráficos con los datos

---

¿Necesitas ayuda? Revisa los logs en la consola del navegador o en Supabase Dashboard > Logs.

