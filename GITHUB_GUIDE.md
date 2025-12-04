# 📋 Guía para Subir el Proyecto a GitHub

## ⚠️ Archivos que NO debes subir (ya están en .gitignore)

### 🔒 Seguridad - NUNCA subir:
- ✅ **`.env`** y archivos `.env.*` - Contienen credenciales y API keys
- ✅ **`node_modules/`** - Dependencias (se instalan con `npm install`)
- ✅ **`package-lock.json`** - Se regenera automáticamente
- ✅ **Claves y certificados** (`.pem`, `.key`, `.jks`, etc.)

### 🏗️ Builds y compilaciones:
- ✅ **`.next/`** - Builds de Next.js
- ✅ **`dist/`**, **`build/`**, **`out/`** - Carpetas de compilación
- ✅ **`.expo/`** - Archivos temporales de Expo
- ✅ **`ios/`**, **`android/`** - Builds nativos (si existen)

### 📝 Logs y temporales:
- ✅ **`*.log`** - Archivos de log
- ✅ **`.DS_Store`**, **`Thumbs.db`** - Archivos del sistema operativo
- ✅ **`.vscode/`**, **`.idea/`** - Configuraciones del editor

## ✅ Archivos que SÍ debes subir:

### 📄 Código fuente:
- ✅ Todos los archivos `.ts`, `.tsx`, `.js`, `.jsx`
- ✅ Archivos de configuración: `package.json`, `tsconfig.json`, `app.json`
- ✅ Scripts SQL: `scripts/*.sql` (si no contienen datos sensibles)
- ✅ Documentación: `README.md`, `*.md`

### 🎨 Assets:
- ✅ Imágenes: `assets/`, `public/`
- ✅ Iconos y recursos visuales

### ⚙️ Configuración:
- ✅ `tailwind.config.ts`
- ✅ `next.config.js`
- ✅ `app.json` (⚠️ Ver nota importante abajo sobre credenciales)

## ⚠️ IMPORTANTE: Credenciales en app.json

**Nota sobre `FritoLay-Repartidor/app.json`:**
- El archivo `app.json` contiene las credenciales de Supabase (URL y Anon Key)
- La **Anon Key** está diseñada para ser pública (se usa en el cliente)
- **Es seguro subirlo** porque:
  - La Anon Key es pública por diseño
  - Está protegida por políticas RLS en Supabase
  - No es la Service Role Key (esa SÍ es privada)
- Si prefieres no subir credenciales, puedes:
  1. Usar el `app.json.example` como template (ya creado)
  2. Agregar `app.json` al `.gitignore` temporalmente
  3. Documentar que cada desarrollador debe crear su propio `app.json`

**⚠️ NUNCA subir:**
- `SUPABASE_SERVICE_ROLE_KEY` (esta es privada y solo para servidor)
- Contraseñas o tokens privados
- Archivos `.env` con credenciales

## 📝 Checklist antes de subir:

### 1. Verificar credenciales:
- [ ] No hay URLs de Supabase hardcodeadas en el código
- [ ] No hay API keys en archivos de código
- [ ] Las credenciales están en variables de entorno (`.env`)

### 2. Verificar archivos sensibles:
- [ ] Revisar que `.env` esté en `.gitignore`
- [ ] Revisar que `node_modules/` esté ignorado
- [ ] No hay contraseñas o tokens en el código

### 3. Limpiar archivos temporales:
- [ ] Eliminar `node_modules/` (se reinstalan con `npm install`)
- [ ] Eliminar `.next/` o `dist/` si existen
- [ ] Eliminar logs (`*.log`)

## 🚀 Pasos para subir con GitHub Desktop:

1. **Abrir GitHub Desktop**
2. **Verificar cambios pendientes:**
   - Deberías ver los archivos modificados
   - NO deberías ver `node_modules/`, `.env`, `.next/`, etc.

3. **Revisar los archivos a subir:**
   - Si ves archivos que NO deberían subirse, agrégalos manualmente al `.gitignore`

4. **Escribir mensaje de commit:**
   ```
   feat: Agregar funcionalidad de asignación de pedidos a repartidores
   - Implementar asignación desde dashboard admin
   - Agregar visualización de pedidos en app móvil
   - Corregir políticas RLS para repartidores
   ```

5. **Hacer commit y push:**
   - Click en "Commit to main" (o tu rama)
   - Click en "Push origin"

## ⚠️ Si ves archivos que NO deberían subirse:

Si en GitHub Desktop ves archivos como:
- `node_modules/`
- `.env`
- `.next/`
- `*.log`

**Solución:**
1. Agrega el patrón al `.gitignore`
2. Ejecuta en la terminal:
   ```bash
   git rm -r --cached node_modules/
   git rm --cached .env
   ```
3. Haz commit de los cambios en `.gitignore`

## 📦 Estructura recomendada en GitHub:

```
Proyecto-Frito-Lay-v2/
├── fritolay-admin/          ✅ Subir (sin node_modules, .next, .env)
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── scripts/             ✅ Subir scripts SQL
│   └── package.json
├── FritoLay-Repartidor/     ✅ Subir (sin node_modules, .expo)
│   ├── app/
│   ├── contexts/
│   ├── services/
│   ├── app.json             ✅ Subir (ver nota sobre credenciales arriba)
│   └── package.json
├── .gitignore               ✅ Subir
└── README.md                ✅ Subir
```

## 🔍 Verificar antes de commit:

Ejecuta este comando para ver qué se va a subir:
```bash
git status
```

Si ves archivos que no deberían subirse, agrégalos al `.gitignore` y ejecuta:
```bash
git rm -r --cached [nombre-del-archivo-o-carpeta]
```

## ✅ Listo para subir

Una vez que hayas verificado todo, puedes hacer commit y push con confianza. El `.gitignore` ya está configurado para proteger tus credenciales y archivos sensibles.

