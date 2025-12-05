// Colores de la aplicación
export const Colors = {
  // Colores principales
  primary: '#007AFF',
  primaryDark: '#0056B3',
  primaryLight: '#E6F4FE',
  
  // Colores de estado
  success: '#34C759',
  warning: '#FFA500',
  error: '#FF3B30',
  info: '#5AC8FA',
  
  // Escala de grises
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  
  // Fondos
  background: '#F8F9FA',
  backgroundCard: '#FFFFFF',
  backgroundSecondary: '#F0F0F0',
  
  // Bordes
  border: '#E1E5E9',
  borderLight: '#F0F0F0',
  
  // Otros
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Espaciados base
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Tamaños de fuente base
export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  title: 28,
  hero: 32,
};

// Radios de borde
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Sombras
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Estilos de texto comunes
export const TextStyles = {
  hero: {
    fontSize: FontSizes.hero,
    fontWeight: 'bold' as const,
    color: Colors.text,
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: 'bold' as const,
    color: Colors.text,
  },
  heading: {
    fontSize: FontSizes.xxl,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  subheading: {
    fontSize: FontSizes.xl,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  body: {
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  bodySmall: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
  },
};

// Colores de estado para entregas
export const DeliveryStatusColors = {
  assigned: Colors.warning,
  in_transit: Colors.primary,
  delivered: Colors.success,
  failed: Colors.error,
  pending: Colors.textLight,
};

// Textos de estado para entregas
export const DeliveryStatusText: Record<string, string> = {
  assigned: 'Asignado',
  in_transit: 'En Tránsito',
  delivered: 'Entregado',
  failed: 'Fallido',
  pending: 'Pendiente',
};

