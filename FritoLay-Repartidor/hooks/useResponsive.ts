import { useWindowDimensions } from 'react-native';

// Breakpoints
const BREAKPOINTS = {
  xs: 0,      // Teléfonos pequeños
  sm: 360,    // Teléfonos medianos
  md: 400,    // Teléfonos grandes
  lg: 600,    // Tablets pequeñas
  xl: 900,    // Tablets grandes
};

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ResponsiveValues {
  width: number;
  height: number;
  isSmallPhone: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  breakpoint: Breakpoint;
  // Escalado responsive
  wp: (percentage: number) => number; // width percentage
  hp: (percentage: number) => number; // height percentage
  fs: (size: number) => number;       // font size
  sp: (size: number) => number;       // spacing
  rs: (size: number) => number;       // responsive size (general)
}

export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();
  
  // Determinar breakpoint actual
  const getBreakpoint = (): Breakpoint => {
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  };

  const breakpoint = getBreakpoint();
  const isLandscape = width > height;
  const isTablet = width >= BREAKPOINTS.lg;
  const isPhone = width < BREAKPOINTS.lg;
  const isSmallPhone = width < BREAKPOINTS.sm;

  // Base width para cálculos (iPhone SE width como referencia)
  const baseWidth = 375;
  const baseHeight = 667;

  // Calcular factor de escala
  const widthScale = width / baseWidth;
  const heightScale = height / baseHeight;
  const scale = Math.min(widthScale, heightScale);

  // Funciones de escalado
  const wp = (percentage: number): number => {
    return Math.round((width * percentage) / 100);
  };

  const hp = (percentage: number): number => {
    return Math.round((height * percentage) / 100);
  };

  const fs = (size: number): number => {
    // Escalar fuentes con límites min/max
    const scaledSize = size * scale;
    const minSize = size * 0.8;
    const maxSize = size * 1.3;
    return Math.round(Math.min(Math.max(scaledSize, minSize), maxSize));
  };

  const sp = (size: number): number => {
    // Escalar espaciado
    return Math.round(size * scale);
  };

  const rs = (size: number): number => {
    // Escala general responsive
    return Math.round(size * widthScale);
  };

  return {
    width,
    height,
    isSmallPhone,
    isPhone,
    isTablet,
    isLandscape,
    breakpoint,
    wp,
    hp,
    fs,
    sp,
    rs,
  };
}

// Utilidad para seleccionar valor según breakpoint
export function selectByBreakpoint<T>(
  breakpoint: Breakpoint,
  values: Partial<Record<Breakpoint, T>> & { default: T }
): T {
  const order: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
  const startIndex = order.indexOf(breakpoint);
  
  for (let i = startIndex; i < order.length; i++) {
    const bp = order[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }
  
  return values.default;
}

