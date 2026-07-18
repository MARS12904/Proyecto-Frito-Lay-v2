import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AppButton } from './AppButton';
import { Spacing, BorderRadius } from '../../constants/theme';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  options: {
    cancelable?: boolean;
    onDismiss?: () => void;
  };
}

let globalAlertSetter: ((state: AlertState) => void) | null = null;

// Sobrescribir Alert.alert globalmente solo en plataforma Web
if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons, options) => {
    const formattedButtons = buttons && buttons.length > 0 
      ? buttons 
      : [{ text: 'Aceptar' }];

    if (globalAlertSetter) {
      globalAlertSetter({
        visible: true,
        title: title || '',
        message: typeof message === 'string' ? message : '',
        buttons: formattedButtons,
        options: options || {}
      });
    } else {
      // Fallback funcional si el componente raíz no se ha montado aún
      const hasCancel = formattedButtons.some(
        b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancelar' || b.text?.toLowerCase() === 'cancel'
      );
      if (hasCancel) {
        const ok = window.confirm(`${title}\n\n${message || ''}`);
        const okBtn = formattedButtons.find(
          b => b.style !== 'cancel' && b.text?.toLowerCase() !== 'cancelar' && b.text?.toLowerCase() !== 'cancel'
        );
        const cancelBtn = formattedButtons.find(
          b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancelar' || b.text?.toLowerCase() === 'cancel'
        );
        if (ok && okBtn?.onPress) okBtn.onPress();
        else if (!ok && cancelBtn?.onPress) cancelBtn.onPress();
      } else {
        window.alert(`${title}\n\n${message || ''}`);
        if (formattedButtons[0]?.onPress) formattedButtons[0].onPress();
      }
    }
  };
}

export function WebAlertProvider() {
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    options: {}
  });

  const { colors, isDark } = useTheme();

  useEffect(() => {
    globalAlertSetter = setAlert;
    return () => {
      globalAlertSetter = null;
    };
  }, []);

  // Agregar soporte para la tecla ESC para cerrar el modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && alert.visible) {
        handleDismiss();
      }
    };
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [alert.visible, alert.options]);

  if (!alert.visible || Platform.OS !== 'web') return null;

  const handleButtonPress = (btn: AlertButton) => {
    setAlert(prev => ({ ...prev, visible: false }));
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const handleDismiss = () => {
    if (alert.options.cancelable !== false) {
      setAlert(prev => ({ ...prev, visible: false }));
      if (alert.options.onDismiss) {
        alert.options.onDismiss();
      } else {
        // Por defecto, si hay un botón de tipo 'cancel', ejecutar su callback al cerrar
        const cancelBtn = alert.buttons.find(b => b.style === 'cancel');
        if (cancelBtn?.onPress) {
          cancelBtn.onPress();
        }
      }
    }
  };

  // Determinar la alineación de los botones
  // Si hay 2 o menos botones y los textos son cortos (< 15 caracteres), los mostramos en fila (row)
  const isRowLayout = alert.buttons.length <= 2 && alert.buttons.every(b => (b.text || '').length < 15);

  return (
    <Modal
      transparent
      visible={alert.visible}
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleDismiss}
      >
        <View 
          style={[
            styles.backdropBlur, 
            { 
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.4)',
              // Estilo específico de web para desenfoque de fondo
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            } as any
          ]} 
        />
        
        <TouchableOpacity 
          activeOpacity={1} 
          style={[
            styles.card, 
            { 
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            }
          ]}
        >
          <View style={styles.content}>
            {alert.title ? (
              <Text style={[styles.title, { color: colors.text }]}>{alert.title}</Text>
            ) : null}
            
            {alert.message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]}>{alert.message}</Text>
            ) : null}
          </View>
          
          <View style={[styles.buttonContainer, isRowLayout ? styles.rowButtons : styles.columnButtons]}>
            {alert.buttons.map((btn, index) => {
              let variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
              
              if (btn.style === 'cancel') {
                variant = 'ghost';
              } else if (btn.style === 'destructive') {
                variant = 'danger';
              } else if (index === 0 && alert.buttons.length > 1 && alert.buttons[1].style !== 'cancel') {
                // En un diseño de 2 botones sin estilos específicos, el primero suele ser secundario/cancelar
                variant = 'ghost';
              }
              
              return (
                <AppButton
                  key={index}
                  label={btn.text || 'Aceptar'}
                  onPress={() => handleButtonPress(btn)}
                  variant={variant}
                  fullWidth={!isRowLayout}
                  style={isRowLayout ? styles.flexButton : undefined}
                />
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  backdropBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '90%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  content: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: Spacing.sm,
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  columnButtons: {
    flexDirection: 'column-reverse',
  },
  flexButton: {
    flex: 1,
  },
});
