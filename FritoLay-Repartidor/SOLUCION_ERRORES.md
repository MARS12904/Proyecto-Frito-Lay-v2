# Solución de Errores de Instalación

## Errores Comunes y Soluciones

### 1. Error: "Cannot find module 'expo-router'"
**Solución:**
```bash
npm install expo-router@~6.0.14
```

### 2. Error: "Module not found: Can't resolve '@expo/vector-icons'"
**Solución:**
```bash
npm install @expo/vector-icons@^15.0.2
```

### 3. Error: "Assets not found" o "icon.png not found"
**Solución:**
1. Copia el icono de LayGoProy:
   ```powershell
   Copy-Item ..\LayGoProy\assets\images\icon.png assets\icon.png
   ```

2. O crea un icono temporal de 1024x1024px y guárdalo como `assets/icon.png`

### 4. Error: "TypeScript compilation errors"
**Solución:**
```bash
npm install --save-dev typescript@5.9.2
npx tsc --init
```

### 5. Error: "Peer dependency conflicts"
**Solución:**
```bash
npm install --legacy-peer-deps
```

### 6. Error: "Cannot find module 'react-native-reanimated'"
**Solución:**
```bash
npm install react-native-reanimated@~4.1.1
```

### 7. Error al ejecutar `npm start`
**Solución:**
1. Limpia la caché de npm:
   ```bash
   npm cache clean --force
   ```

2. Elimina node_modules y reinstala:
   ```bash
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

### 8. Error: "expo-doctor" encuentra problemas
**Solución:**
Ejecuta:
```bash
npx expo-doctor
```
Y sigue las recomendaciones que aparezcan.

### 9. Error en Windows PowerShell
Si tienes problemas con comandos, usa:
```powershell
# En lugar de &&
cd FritoLay-Repartidor; npm install

# En lugar de ||
if (Test-Path file) { ... } else { ... }
```

### 10. Error: "Metro bundler failed"
**Solución:**
```bash
npx expo start --clear
```

## Pasos de Instalación Completos (Windows)

```powershell
# 1. Navegar al directorio
cd FritoLay-Repartidor

# 2. Limpiar instalación previa (si existe)
if (Test-Path node_modules) {
    Remove-Item -Recurse -Force node_modules
}
if (Test-Path package-lock.json) {
    Remove-Item package-lock.json
}

# 3. Instalar dependencias
npm install

# 4. Si hay errores de peer dependencies
npm install --legacy-peer-deps

# 5. Verificar instalación
npx expo-doctor

# 6. Iniciar la app
npm start
```

## Verificar que Todo Esté Correcto

1. **Verificar estructura de carpetas:**
   ```
   FritoLay-Repartidor/
   ├── app/
   ├── assets/
   ├── contexts/
   ├── lib/
   ├── services/
   ├── package.json
   └── app.json
   ```

2. **Verificar que assets/icon.png existe:**
   - Si no existe, cópialo de LayGoProy o crea uno temporal

3. **Verificar package.json:**
   - Debe tener todas las dependencias listadas
   - Versiones compatibles con Expo SDK 54

4. **Verificar app.json:**
   - Debe tener las credenciales de Supabase
   - Plugins correctamente configurados

## Si Nada Funciona

1. **Reinstalación completa:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm cache clean --force
   npm install
   ```

2. **Verificar versión de Node.js:**
   ```bash
   node --version  # Debe ser 18 o superior
   ```

3. **Actualizar npm:**
   ```bash
   npm install -g npm@latest
   ```

4. **Usar yarn en lugar de npm:**
   ```bash
   npm install -g yarn
   yarn install
   ```

## Contacto

Si después de seguir estos pasos aún tienes problemas, comparte el mensaje de error completo para poder ayudarte mejor.


