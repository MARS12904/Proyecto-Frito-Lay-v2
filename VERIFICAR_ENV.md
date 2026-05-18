# Verificación de variables de entorno

## LayGoProy (app comerciante)

Crea `LayGoProy/.env` o configura `app.json` → `extra`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

## Verificar que .env no se sube a git

```bash
git status
git ls-files | findstr ".env"
```

Si algún `.env` está rastreado:

```bash
git rm --cached LayGoProy/.env
git commit -m "chore: remover .env del rastreo"
```

## Base de datos

Ejecuta `setup-database-complete.sql` en el SQL Editor de Supabase antes de probar la app.
