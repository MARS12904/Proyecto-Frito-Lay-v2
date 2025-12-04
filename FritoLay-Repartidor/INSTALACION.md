# Guía de Instalación - Frito Lay Repartidor

## Pasos para Instalar

### 1. Verificar Node.js y npm
Asegúrate de tener Node.js 18+ instalado:
```bash
node --version
npm --version
```

### 2. Instalar Expo CLI globalmente (si no lo tienes)
```bash
npm install -g expo-cli
```

### 3. Navegar a la carpeta del proyecto
```bash
cd FritoLay-Repartidor
```

### 4. Instalar dependencias
```bash
npm install
```

Si encuentras errores, intenta:
```bash
npm install --legacy-peer-deps
```

O limpia la caché:
```bash
npm cache clean --force
npm install
```

### 5. Crear carpeta de assets (si no existe)
```bash
mkdir assets
```

### 6. Crear icono básico (opcional)
Si no tienes iconos, puedes usar un placeholder temporal. La app funcionará sin ellos.

### 7. Verificar configuración de Supabase
Asegúrate de que `app.json` tenga las credenciales correctas de Supabase:
```json
"extra": {
  "supabaseUrl": "tu-url",
  "supabaseAnonKey": "tu-key"
}
```

### 8. Iniciar la aplicación
```bash
npm start
```

## Solución de Problemas Comunes

### Error: "Cannot find module"
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Error: "expo-router not found"
```bash
npm install expo-router@~6.0.14
```

### Error: "TypeScript errors"
```bash
npm install --save-dev typescript@5.9.2
```

### Error: Assets not found
Crea un archivo placeholder en `assets/icon.png` o comenta las referencias a assets en `app.json` temporalmente.

### Error en Windows
Si estás en Windows y hay problemas con los comandos, usa PowerShell o Git Bash.

## Verificar Instalación

Después de instalar, verifica que todo esté correcto:
```bash
npx expo-doctor
```

Este comando verificará la configuración de tu proyecto Expo.


