# Guía de Solución de Problemas - Registro de Administradores

## Problema: No se están registrando correctamente los administradores

### Pasos para Diagnosticar y Solucionar

#### 1. Verificar Variables de Entorno

Asegúrate de que el archivo `.env.local` contenga:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

**IMPORTANTE**: El `SUPABASE_SERVICE_ROLE_KEY` es crítico. Este key bypass RLS y permite crear usuarios desde el servidor.

#### 2. Ejecutar Script SQL de Corrección

Ejecuta el script `scripts/fix-admin-registration.sql` en el SQL Editor de Supabase:

1. Ve a tu proyecto en Supabase Dashboard
2. Abre el SQL Editor
3. Copia y pega el contenido de `scripts/fix-admin-registration.sql`
4. Ejecuta el script

Este script:
- Verifica que todos los campos necesarios existan
- Asegura que los constraints estén correctos
- Crea índices necesarios

#### 3. Verificar Estructura de la Tabla `user_profiles`

La tabla debe tener al menos estos campos:
- `id` (UUID, PRIMARY KEY)
- `email` (VARCHAR/TEXT)
- `name` (VARCHAR/TEXT)
- `role` (VARCHAR, CHECK: 'admin', 'repartidor', 'comerciante')
- `is_active` (BOOLEAN, DEFAULT true)
- `preferences` (JSONB, opcional)

#### 4. Verificar Políticas RLS

El `SUPABASE_SERVICE_ROLE_KEY` debería bypass RLS automáticamente. Si hay problemas:

1. Ve a Authentication > Policies en Supabase Dashboard
2. Verifica que no haya políticas que bloqueen inserts desde el servicio
3. Si es necesario, crea una política temporal para el servicio role

#### 5. Revisar Logs

Cuando intentes registrar un administrador:

1. **En el navegador**: Abre la consola (F12) y busca errores
2. **En el servidor**: Revisa la terminal donde corre `npm run dev`
3. Los logs ahora incluyen información detallada:
   - "Registration attempt"
   - "Creating auth user..."
   - "Auth user created"
   - "Creating user profile..."
   - "Profile created successfully"

#### 6. Errores Comunes y Soluciones

**Error: "Error al crear perfil: new row violates check constraint"**
- **Solución**: El campo `role` tiene un constraint. Asegúrate de que el valor sea exactamente 'admin', 'repartidor', o 'comerciante'

**Error: "Error al crear perfil: null value in column violates not-null constraint"**
- **Solución**: Faltan campos requeridos. Ejecuta el script SQL de corrección

**Error: "Error al crear usuario: User already registered"**
- **Solución**: El email ya existe en auth.users. Verifica en Authentication > Users

**Error: "Missing env.SUPABASE_SERVICE_ROLE_KEY"**
- **Solución**: Agrega la variable de entorno y reinicia el servidor

#### 7. Verificar que el Usuario se Creó

Después de un registro exitoso, verifica:

1. **En Supabase Dashboard > Authentication > Users**: Debe aparecer el nuevo usuario
2. **En Supabase Dashboard > Table Editor > user_profiles**: Debe aparecer el perfil con `role = 'admin'`

#### 8. Probar el Registro

1. Ve a `http://localhost:3000/register`
2. Completa el formulario:
   - Nombre completo
   - Email válido
   - Contraseña (mínimo 6 caracteres)
   - Confirmar contraseña
3. Revisa los mensajes de error si aparecen
4. Revisa la consola del navegador y la terminal del servidor

#### 9. Si el Problema Persiste

Comparte esta información:
- El mensaje de error exacto (del formulario y de la consola)
- Los logs del servidor (terminal donde corre `npm run dev`)
- La estructura de tu tabla `user_profiles` (puedes obtenerla con el script SQL)
- Si el usuario se crea en `auth.users` pero no en `user_profiles`

### Notas Importantes

- El `SUPABASE_SERVICE_ROLE_KEY` es muy poderoso y debe mantenerse secreto
- Nunca lo expongas en el código del cliente
- Solo úsalo en rutas API del servidor
- El cliente admin creado con este key automáticamente bypass RLS


