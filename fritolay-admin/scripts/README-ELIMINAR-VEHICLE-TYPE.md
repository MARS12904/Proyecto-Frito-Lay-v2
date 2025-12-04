# Eliminar Columna vehicle_type de user_profiles

## Descripción

Este script elimina la columna `vehicle_type` de la tabla `user_profiles` en la base de datos.

## ¿Por qué se eliminó?

La funcionalidad de tipo de vehículo ya no es necesaria en el sistema. Se ha eliminado de:
- ✅ Formularios de registro de repartidores
- ✅ Formularios de edición de repartidores
- ✅ Tabla de repartidores en el dashboard
- ✅ API de registro y actualización
- ✅ Perfil de la app móvil

## Instrucciones

### Opción 1: Ejecutar desde Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Abre el archivo `eliminar-columna-vehicle-type.sql`
4. Copia y pega el contenido completo
5. Haz clic en **Run** para ejecutar el script

### Opción 2: Ejecutar desde línea de comandos

Si tienes `psql` configurado:

```bash
psql -h [tu-host] -U postgres -d postgres -f eliminar-columna-vehicle-type.sql
```

## ¿Qué hace el script?

1. **Verifica** que la columna existe antes de intentar eliminarla
2. **Elimina** cualquier constraint CHECK relacionado con `vehicle_type`
3. **Elimina** cualquier índice relacionado con `vehicle_type`
4. **Elimina** la columna `vehicle_type` de la tabla `user_profiles`
5. **Verifica** que la eliminación fue exitosa
6. **Muestra** la estructura actualizada de la tabla

## Seguridad

- ✅ El script es **idempotente**: puede ejecutarse múltiples veces sin problemas
- ✅ Si la columna no existe, simplemente mostrará un mensaje informativo
- ✅ No afecta otros datos de la tabla
- ✅ No elimina registros, solo la columna

## Verificación Post-Ejecución

Después de ejecutar el script, puedes verificar que la columna fue eliminada:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;
```

La columna `vehicle_type` no debería aparecer en los resultados.

## Notas Importantes

- ⚠️ **Backup**: Aunque este script es seguro, siempre es recomendable hacer un backup de tu base de datos antes de ejecutar cambios estructurales
- ⚠️ **Datos existentes**: Los datos en la columna `vehicle_type` se perderán permanentemente. Si necesitas conservar esta información, exporta los datos antes de ejecutar el script
- ✅ **Sin downtime**: La eliminación de la columna no requiere tiempo de inactividad

## Rollback

Si necesitas restaurar la columna después de eliminarla, puedes ejecutar:

```sql
ALTER TABLE public.user_profiles 
ADD COLUMN vehicle_type VARCHAR(50);
```

Sin embargo, los datos previos no se recuperarán.

