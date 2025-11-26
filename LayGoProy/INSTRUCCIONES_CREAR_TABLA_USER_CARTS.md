# 📋 Instrucciones para Crear la Tabla `user_carts` en Supabase

## ⚠️ Problema
Si ves el error: `"Could not find the table 'public.user_carts' in the schema cache"`, significa que la tabla no existe en tu base de datos de Supabase.

## ✅ Solución

### Paso 1: Abrir Supabase Dashboard
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto

### Paso 2: Abrir SQL Editor
1. En el menú lateral, haz clic en **"SQL Editor"**
2. Haz clic en **"New query"**

### Paso 3: Ejecutar el Script SQL
1. Copia y pega el siguiente script SQL:

```sql
-- Tabla para almacenar carritos de usuarios
CREATE TABLE IF NOT EXISTS public.user_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_wholesale_mode BOOLEAN DEFAULT true,
  delivery_schedule JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON public.user_carts(user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_carts_updated_at
  BEFORE UPDATE ON public.user_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_carts_updated_at();

-- Política RLS: Los usuarios solo pueden ver/editar su propio carrito
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart"
  ON public.user_carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart"
  ON public.user_carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart"
  ON public.user_carts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart"
  ON public.user_carts FOR DELETE
  USING (auth.uid() = user_id);
```

2. Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

### Paso 4: Verificar
1. Deberías ver un mensaje de éxito
2. La tabla `user_carts` ahora debería estar creada
3. Reinicia la aplicación para que los cambios surtan efecto

## 📝 Nota
- El script usa `CREATE TABLE IF NOT EXISTS`, por lo que es seguro ejecutarlo múltiples veces
- La tabla se creará en el esquema `public`
- Las políticas RLS (Row Level Security) aseguran que los usuarios solo puedan ver/editar su propio carrito

## 🔄 Alternativa: Usar el Script del Proyecto
También puedes usar el archivo `scripts/create-user-carts-table.sql` que está en el proyecto. Solo asegúrate de agregar `public.` antes del nombre de la tabla si es necesario.

