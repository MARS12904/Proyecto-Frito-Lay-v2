import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useAppColors } from '../../contexts/ThemeContext';

type FormSheetModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** Modal a pantalla completa: un solo encabezado (evita doble header con la pantalla padre). */
export function FormSheetModal({ visible, title, onClose, children }: FormSheetModalProps) {
  const insets = useSafeAreaInsets();
  const { scaleFont, horizontalPadding, isCompact } = useResponsive();
  const colors = useAppColors();
  const styles = getStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + (isCompact ? 6 : 8),
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={[styles.title, { fontSize: scaleFont(isCompact ? 17 : 18) }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingBottom: insets.bottom + Spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
});
