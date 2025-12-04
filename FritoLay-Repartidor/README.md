# Frito Lay - App Repartidor

Aplicación móvil para repartidores de Frito Lay. Permite a los repartidores gestionar sus entregas, cambiar estados de pedidos, tomar fotos de entrega y registrar ubicaciones.

## Características

- ✅ Autenticación con verificación de rol repartidor
- ✅ Dashboard con estadísticas de entregas
- ✅ Lista de pedidos asignados con filtros
- ✅ Detalles completos de cada pedido
- ✅ Cambio de estados de pedidos (Asignado → En Tránsito → Entregado)
- ✅ Toma de fotos de entrega
- ✅ Registro de ubicación GPS
- ✅ Perfil del repartidor

## Requisitos

- Node.js 18+
- Expo CLI
- Cuenta de Supabase configurada

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno en `app.json`:
```json
{
  "extra": {
    "supabaseUrl": "tu-url-de-supabase",
    "supabaseAnonKey": "tu-anon-key"
  }
}
```

3. Iniciar la aplicación:
```bash
npm start
```

## Estructura del Proyecto

```
FritoLay-Repartidor/
├── app/                    # Pantallas y navegación
│   ├── (tabs)/            # Tabs principales
│   │   ├── index.tsx      # Dashboard
│   │   ├── orders.tsx     # Lista de pedidos
│   │   └── profile.tsx    # Perfil
│   ├── auth/              # Autenticación
│   │   └── login.tsx      # Login
│   └── orders/            # Detalles de pedidos
│       └── [id].tsx       # Detalle de pedido
├── contexts/              # Contextos de React
│   └── AuthContext.tsx   # Contexto de autenticación
├── services/              # Servicios
│   └── deliveryService.ts # Servicio de entregas
├── lib/                   # Utilidades
│   └── supabase.ts       # Cliente de Supabase
└── hooks/                 # Hooks personalizados
```

## Funcionalidades Principales

### Autenticación
- Login con verificación de rol `repartidor`
- Validación de cuenta activa
- Logout seguro

### Dashboard
- Estadísticas de pedidos (Total, Asignados, En Tránsito, Entregados)
- Lista de pedidos recientes
- Acceso rápido a detalles

### Gestión de Pedidos
- Ver todos los pedidos asignados
- Filtrar por estado
- Ver detalles completos de cada pedido
- Cambiar estado de pedidos
- Tomar fotos de entrega
- Registrar ubicación GPS

### Perfil
- Información personal del repartidor
- Datos del vehículo
- Número de licencia

## Base de Datos

La app utiliza las siguientes tablas de Supabase:

- `user_profiles` - Perfiles de usuario (rol: repartidor)
- `delivery_assignments` - Asignaciones de entregas
- `delivery_orders` - Órdenes de entrega
- `order_items` - Items de cada orden
- `delivery_tracking` - Tracking de ubicaciones

## Permisos Requeridos

- **Cámara**: Para tomar fotos de entrega
- **Ubicación**: Para registrar la ubicación durante la entrega

## Desarrollo

### Ejecutar en desarrollo
```bash
npm start
```

### Ejecutar en Android
```bash
npm run android
```

### Ejecutar en iOS
```bash
npm run ios
```

## Notas

- La app requiere que el usuario tenga el rol `repartidor` en la base de datos
- Los pedidos se obtienen desde `delivery_assignments` filtrando por `repartidor_id`
- Los cambios de estado se sincronizan tanto en `delivery_assignments` como en `delivery_orders`



