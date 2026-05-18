import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

type ActionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  stack?: boolean;
};

export function ActionRow({ icon, label, onPress, color = Colors.light.text, stack }: ActionRowProps) {
  const { scaleFont, stackActions } = useResponsive();
  const useStack = stack ?? stackActions;

  return (
    <TouchableOpacity
      style={[styles.button, useStack && styles.buttonStacked]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={color} style={styles.icon} />
      <Text
        style={[styles.label, { fontSize: scaleFont(13), color }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function ActionRowGroup({ children }: { children: React.ReactNode }) {
  const { stackActions } = useResponsive();
  return (
    <View style={[styles.group, stackActions && styles.groupStacked]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupStacked: {
    flexDirection: 'column',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: '30%',
    maxWidth: '100%',
  },
  buttonStacked: {
    minWidth: '100%',
    maxWidth: '100%',
  },
  icon: {
    marginRight: 6,
  },
  label: {
    flex: 1,
    flexShrink: 1,
    fontWeight: '500',
  },
});
