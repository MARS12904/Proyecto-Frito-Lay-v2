import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

type TabPageProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: 'top' | 'none';
};

/** Contenedor estándar para pantallas del tab bar (safe area + fondo). */
export function TabPage({ children, style, edges = 'top' }: TabPageProps) {
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useResponsive();

  return (
    <View
      style={[
        styles.container,
        edges === 'top' && { paddingTop: insets.top },
        { paddingHorizontal: horizontalPadding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
});
