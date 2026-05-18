import React from 'react';
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
  textStyle,
  fullWidth = true,
}: AppButtonProps) {
  const { scaleFont, isCompact } = useResponsive();

  const variantStyle =
    variant === 'primary'
      ? styles.primary
      : variant === 'secondary'
        ? styles.secondary
        : variant === 'danger'
          ? styles.danger
          : styles.ghost;

  const variantTextStyle =
    variant === 'ghost' ? styles.ghostText : styles.primaryText;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyle,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {icon}
      <Text
        style={[
          styles.label,
          variantTextStyle,
          { fontSize: scaleFont(isCompact ? 14 : 15) },
          textStyle,
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
    minHeight: 48,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: Colors.light.primary,
  },
  secondary: {
    backgroundColor: Colors.light.secondary,
  },
  danger: {
    backgroundColor: Colors.light.error,
  },
  ghost: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  primaryText: {
    color: Colors.light.background,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  ghostText: {
    color: Colors.light.text,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
});
