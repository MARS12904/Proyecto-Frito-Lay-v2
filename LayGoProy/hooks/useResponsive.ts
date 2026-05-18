import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Breakpoints } from '../constants/theme';

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const isCompact = width < 360;
    const isSmall = width < Breakpoints.sm;
    const isMedium = width >= Breakpoints.sm && width < Breakpoints.md;
    const isLargePhone = width >= Breakpoints.md;

    const horizontalPadding = isCompact ? 12 : isSmall ? 14 : 16;
    const contentMaxWidth = Math.min(width, 520);

    const scaleFont = (base: number) => {
      const widthFactor = Math.min(1.08, Math.max(0.88, width / 375));
      const scaleFactor = Math.min(fontScale, 1.15);
      return Math.round(base * widthFactor * scaleFactor);
    };

    return {
      width,
      height,
      fontScale,
      insets,
      isCompact,
      isSmall,
      isMedium,
      isLargePhone,
      horizontalPadding,
      contentMaxWidth,
      headerPaddingTop: insets.top + (isCompact ? 6 : 8),
      headerPaddingBottom: isCompact ? 10 : 12,
      scaleFont,
      /** Botones en fila en pantallas anchas; en columna si no caben */
      stackActions: width < 380,
    };
  }, [width, height, fontScale, insets]);
}
