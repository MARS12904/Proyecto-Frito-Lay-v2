import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useAppColors } from '../../contexts/ThemeContext';

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
};

export function ScreenHeader({ title, onBack, rightSlot }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { scaleFont, isCompact, horizontalPadding } = useResponsive();
  const colors = useAppColors();
  const styles = getStyles(colors);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + (isCompact ? 6 : 8),
          paddingHorizontal: horizontalPadding,
          paddingBottom: isCompact ? 10 : 12,
        },
      ]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text
          style={[styles.title, { fontSize: scaleFont(isCompact ? 17 : 18) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {title}
        </Text>

        <View style={styles.right}>{rightSlot ?? <View style={styles.backPlaceholder} />}</View>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  wrapper: {
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backPlaceholder: {
    width: 40,
    height: 40,
  },
  title: {
    flex: 1,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
