# Guía: Registro de Datos en Supabase

## ✅ Cambios Realizados

He actualizado la aplicación para que **registre datos directamente en Supabase** en lugar de solo usar almacenamiento local.

### 1. **Autenticación con Supabase Auth**

**Archivo:** `contexts/AuthContext.tsx`

**Cambios:**
- ✅ `login()` ahora usa `supabase.auth.signInWithPassword()` primero
- ✅ `register()` ahora usa `supabase.auth.signUp()` para crear usuarios en Supabase Auth
- ✅ `checkAuthState()` verifica sesión de Supabase primero
- ✅ `logout()` cierra sesión en Supabase
- ✅ Fallback a sistema local si Supabase no está disponible

**Cómo funciona:**
1. Al registrar un usuario, se crea en `auth.users` de Supabase
2. El trigger `handle_new_user()` crea automáticamente el perfil en `user_profiles`
3. Si el trigger falla, el código crea el perfil manualmente
4. Los usuarios ahora tienen UUIDs válidos (no más IDs locales como `Date.now().toString()`)

### 2. **Servicio de Pedidos Actualizado**

**Archivo:** `services/ordersService.ts`

**Cambios:**
- ✅ `createOrder()` ahora usa `delivery_orders` (tabla real) en lugar de `orders` (vista)
- ✅ Usa `created_by` en lugar de `user_id`
- ✅ Usa `total` en lugar de `total_amount`
- ✅ Genera `order_number` único para cada pedido
- ✅ Crea `order_items` con todos los campos necesarios
- ✅ Fallback a vista `orders` si `delivery_orders` no está disponible

**Campos usados en `delivery_orders`:**
```typescript
{
  order_number: string,        // Generado automáticamente
  created_by: UUID,           // ID del usuario (de Supabase Auth)
  total: number,              // Total calculado
  wholesale_total: number,    // Total mayorista
  savings: number,            // Ahorros
  status: 'pending',         // Estado del pedido
  payment_status: 'pending',  // Estado del pago
  delivery_status: 'pending', // Estado de entrega
  delivery_date: Date,
  delivery_time_slot: string,
  payment_method: string,
  notes: string,
  is_active: true
}
```

## 🚀 Cómo Usar

### 1. **Registrar un Nuevo Usuario**

Cuando un usuario se registra:
1. Se crea en Supabase Auth (`auth.users`)
2. Se crea automáticamente el perfil en `user_profiles` (por trigger o manualmente)
3. El usuario recibe un UUID válido
4. Puede iniciar sesión y sus datos se guardarán en Supabase

### 2. **Crear un Pedido**

Cuando un usuario crea un pedido:
1. Se crea en `delivery_orders` con todos los campos necesarios
2. Se crean los `order_items` asociados
3. Se genera un `order_number` único
4. El pedido queda vinculado al usuario mediante `created_by`

### 3. **Verificar que Funciona**

1. **Registra un nuevo usuario** desde la app
2. **Inicia sesión** con ese usuario
3. **Crea un pedido** (agrega productos al carrito y completa el checkout)
4. **Verifica en Supabase Dashboard:**
   - Ve a `auth.users` → deberías ver el usuario
   - Ve a `user_profiles` → deberías ver el perfil
   - Ve a `delivery_orders` → deberías ver el pedido
   - Ve a `order_items` → deberías ver los items del pedido

## ⚠️ Notas Importantes

### Fallback a Modo Local

Si Supabase no está configurado o hay un error:
- La app seguirá funcionando en modo local (AsyncStorage)
- Los usuarios se crearán localmente con IDs no-UUID
- Los pedidos no se guardarán en Supabase

### Migración de Usuarios Existentes

Si tienes usuarios locales existentes:
- Necesitarán registrarse nuevamente en Supabase para obtener UUIDs
- O puedes migrarlos manualmente creando usuarios en Supabase Auth

### Confirmación de Email

Por defecto, Supabase requiere confirmación de email. Si quieres desactivarla:
1. Ve a Supabase Dashboard → Authentication → Settings
2. Desactiva "Enable email confirmations"

## 🔍 Verificación

### Verificar que Supabase está configurado:

1. Abre `app.json`
2. Verifica que `extra.supabaseUrl` y `extra.supabaseAnonKey` estén configurados
3. Deben ser URLs y keys válidas (no placeholders)

### Verificar que los datos se guardan:

1. Abre la consola de la app (terminal donde corre `npm start`)
2. Busca mensajes como:
   - ✅ `Usuario registrado exitosamente en Supabase: ...`
   - ✅ `Error creating order:` (si hay errores)
3. Revisa Supabase Dashboard para ver los datos

## 📝 Próximos Pasos

1. **Ejecuta el script de base de datos:**
   - Usa `scripts/reset-complete-database-corrected.sql`
   - Esto creará todas las tablas según tu esquema real

2. **Prueba el registro:**
   - Registra un nuevo usuario desde la app
   - Verifica que aparece en Supabase

3. **Prueba crear un pedido:**
   - Agrega productos al carrito
   - Completa el checkout
   - Verifica que el pedido aparece en `delivery_orders`

## ✅ Estado Actual

- ✅ Autenticación migrada a Supabase Auth
- ✅ Registro de usuarios en Supabase
- ✅ Creación de pedidos en `delivery_orders`
- ✅ Fallback a modo local si Supabase no está disponible
- ✅ Compatibilidad con código existente

**La app ahora debería guardar datos en Supabase correctamente.**


