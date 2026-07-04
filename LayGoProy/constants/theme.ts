/**
 * Tema corporativo de Frito-Lay Perú
 * Colores y estilos basados en la identidad visual de la marca
 */

import { Platform, Dimensions as RNDimensions } from 'react-native';

// Obtener dimensiones de la pantalla
const { width: screenWidth, height: screenHeight } = RNDimensions.get('window');

// Breakpoints para responsive design
export const Breakpoints = {
  xs: 320,    // Móviles pequeños
  sm: 375,    // Móviles medianos
  md: 414,    // Móviles grandes
  lg: 768,    // Tablets pequeñas
  xl: 1024,   // Tablets grandes
  xxl: 1200,  // Desktop
};

// Función para determinar el tamaño de pantalla
export const getScreenSize = () => {
  if (screenWidth < Breakpoints.sm) return 'xs';
  if (screenWidth < Breakpoints.md) return 'sm';
  if (screenWidth < Breakpoints.lg) return 'md';
  if (screenWidth < Breakpoints.xl) return 'lg';
  if (screenWidth < Breakpoints.xxl) return 'xl';
  return 'xxl';
};

// Función para obtener valores responsive
export const responsive = (values: {
  xs?: any;
  sm?: any;
  md?: any;
  lg?: any;
  xl?: any;
  xxl?: any;
}) => {
  const size = getScreenSize();
  return values[size] || values.sm || values.md || values.lg || values.xl || values.xxl;
};

// Colores principales de Frito-Lay
const fritolayRed = '#E31E24'; // Rojo principal de Frito-Lay
const fritolayBlue = '#004B87'; // Azul corporativo
const fritolayYellow = '#FFD700'; // Amarillo dorado
const fritolayOrange = '#FF8C00'; // Naranja
const fritolayGreen = '#228B22'; // Verde para elementos positivos

const tintColorLight = fritolayRed;
const tintColorDark = fritolayYellow;

export const Colors = {
  light: {
    // Colores principales
    primary: fritolayRed,
    secondary: fritolayBlue,
    accent: fritolayYellow,
    warning: fritolayOrange,
    success: fritolayGreen,
    
    // Colores de texto
    text: '#1a1a1a',
    textSecondary: '#666666',
    textLight: '#999999',
    
    // Colores de fondo
    background: '#ffffff',
    backgroundSecondary: '#f8f9fa',
    backgroundCard: '#ffffff',
    
    // Colores de interfaz
    tint: tintColorLight,
    icon: '#666666',
    tabIconDefault: '#999999',
    tabIconSelected: tintColorLight,
    
    // Colores de estado
    border: '#e0e0e0',
    shadow: 'rgba(0, 0, 0, 0.1)',
    error: '#dc3545',
    info: '#17a2b8',
  },
  dark: {
    // Colores principales
    primary: fritolayRed,
    secondary: fritolayBlue,
    accent: fritolayYellow,
    warning: fritolayOrange,
    success: fritolayGreen,
    
    // Colores de texto
    text: '#ffffff',
    textSecondary: '#cccccc',
    textLight: '#999999',
    
    // Colores de fondo
    background: '#121212',
    backgroundSecondary: '#1e1e1e',
    backgroundCard: '#2d2d2d',
    
    // Colores de interfaz
    tint: tintColorDark,
    icon: '#cccccc',
    tabIconDefault: '#999999',
    tabIconSelected: tintColorDark,
    
    // Colores de estado
    border: '#404040',
    shadow: 'rgba(0, 0, 0, 0.3)',
    error: '#ff6b6b',
    info: '#4fc3f7',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Espaciado responsive
export const Spacing = {
  xs: responsive({ xs: 2, sm: 4, md: 6, lg: 8 }),
  sm: responsive({ xs: 4, sm: 8, md: 12, lg: 16 }),
  md: responsive({ xs: 8, sm: 16, md: 20, lg: 24 }),
  lg: responsive({ xs: 12, sm: 24, md: 28, lg: 32 }),
  xl: responsive({ xs: 16, sm: 32, md: 36, lg: 40 }),
  xxl: responsive({ xs: 24, sm: 48, md: 52, lg: 56 }),
};

// Tamaños de fuente responsive
export const FontSizes = {
  xs: responsive({ xs: 10, sm: 12, md: 13, lg: 14 }),
  sm: responsive({ xs: 12, sm: 14, md: 15, lg: 16 }),
  md: responsive({ xs: 14, sm: 16, md: 17, lg: 18 }),
  lg: responsive({ xs: 16, sm: 18, md: 20, lg: 22 }),
  xl: responsive({ xs: 18, sm: 20, md: 22, lg: 24 }),
  xxl: responsive({ xs: 20, sm: 24, md: 26, lg: 28 }),
  xxxl: responsive({ xs: 24, sm: 32, md: 36, lg: 40 }),
};

// Dimensiones responsive
export const Dimensions = {
  screenWidth,
  screenHeight,
  isSmallScreen: screenWidth < Breakpoints.sm,
  isMediumScreen: screenWidth >= Breakpoints.sm && screenWidth < Breakpoints.lg,
  isLargeScreen: screenWidth >= Breakpoints.lg,
  isTablet: screenWidth >= Breakpoints.lg,
  isMobile: screenWidth < Breakpoints.lg,
};

// Radios de borde
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
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

// Utilidades responsive
export const ResponsiveUtils = {
  // Padding responsive
  padding: (size: keyof typeof Spacing) => ({
    padding: Spacing[size],
  }),
  
  // Margin responsive
  margin: (size: keyof typeof Spacing) => ({
    margin: Spacing[size],
  }),
  
  // Padding horizontal responsive
  paddingHorizontal: (size: keyof typeof Spacing) => ({
    paddingHorizontal: Spacing[size],
  }),
  
  // Padding vertical responsive
  paddingVertical: (size: keyof typeof Spacing) => ({
    paddingVertical: Spacing[size],
  }),
  
  // Width responsive
  width: (percentage: number) => ({
    width: `${percentage}%`,
  }),
  
  // Height responsive
  height: (percentage: number) => ({
    height: `${percentage}%`,
  }),
  
  // Font size responsive
  fontSize: (size: keyof typeof FontSizes) => ({
    fontSize: FontSizes[size],
  }),
  
  // Container responsive
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  
  // Card responsive
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    ...Shadows.sm,
  },
  
  // Button responsive
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  
  // Input responsive
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
  },
};

// Configuración de la aplicación
export const AppConfig = {
  name: 'Frito-Lay Comerciantes',
  version: '1.0.0',
  description: 'Aplicación para comerciantes minoristas de Frito-Lay Perú',
  company: 'Frito-Lay Perú',
  supportEmail: 'soporte@fritolay.com.pe',
  supportPhone: '+51 970 504 403',
};
