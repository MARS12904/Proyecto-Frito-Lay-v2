# 🔒 Verificación de Archivos .env

## ✅ Archivos .env están protegidos en .gitignore

El `.gitignore` ahora incluye todas las variaciones posibles de archivos `.env`:

### Patrones incluidos:
- `.env` - Archivo base
- `.env.*` - Cualquier variación (`.env.local`, `.env.production`, etc.)
- `*.env` - Archivos que terminan en `.env`
- `**/.env` - Archivos `.env` en cualquier subdirectorio
- `**/.env.*` - Variaciones de `.env` en cualquier subdirectorio
- `**/*.env` - Archivos que terminan en `.env` en cualquier subdirectorio

### Variaciones específicas:
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.staging`
- `.env.test`
- `.env.development.local`
- `.env.production.local`
- `.env.test.local`
- `.env*.local`
- `.env*.backup`
- `.env*.old`
- `.env*.orig`

## 🔍 Cómo verificar que tus .env están protegidos:

### 1. Verificar con git status:
```bash
git status
```
**No deberías ver ningún archivo `.env` en la lista de cambios.**

### 2. Verificar si hay .env rastreados:
```bash
git ls-files | findstr ".env"
```
**No debería mostrar ningún resultado.**

### 3. Si encuentras archivos .env rastreados:

Si git ya está rastreando algún archivo `.env`, necesitas eliminarlo del índice:

```bash
# Para un archivo específico
git rm --cached .env
git rm --cached fritolay-admin/.env
git rm --cached FritoLay-Repartidor/.env

# Para todos los archivos .env
git rm --cached **/.env
git rm --cached **/.env.*
```

Luego haz commit:
```bash
git commit -m "chore: Remover archivos .env del rastreo de git"
```

## 📝 Archivos .env que deberías tener (localmente, NO en git):

### fritolay-admin/.env
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

### FritoLay-Repartidor/.env (opcional, si usas variables de entorno)
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

## ⚠️ IMPORTANTE:

- ✅ **NUNCA** subas archivos `.env` a GitHub
- ✅ **SIEMPRE** usa variables de entorno para credenciales
- ✅ **VERIFICA** antes de cada commit que no hay `.env` en los cambios

## 🛡️ Protección adicional:

Si accidentalmente agregas un `.env` a git, puedes eliminarlo antes de hacer commit:

```bash
# Ver qué archivos están en staging
git status

# Si ves un .env, eliminarlo del staging
git reset HEAD .env

# Verificar que ya no está
git status
```

