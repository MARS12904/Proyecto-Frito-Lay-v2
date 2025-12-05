import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, BorderRadius, Shadows } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { fs, sp, wp, isTablet, isSmallPhone } = useResponsive();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password);
      
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert(
          'Error de acceso',
          'Credenciales incorrectas o no tienes permisos de repartidor'
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // Estilos dinámicos responsive
  const dynamicStyles = {
    scrollContainer: {
      padding: sp(isTablet ? 40 : 20),
      maxWidth: isTablet ? 500 : undefined,
      alignSelf: isTablet ? 'center' as const : undefined,
      width: isTablet ? '100%' : undefined,
    },
    logoContainer: {
      width: sp(isTablet ? 140 : isSmallPhone ? 100 : 120),
      height: sp(isTablet ? 140 : isSmallPhone ? 100 : 120),
      borderRadius: sp(isTablet ? 70 : isSmallPhone ? 50 : 60),
    },
    title: {
      fontSize: fs(isTablet ? 36 : 32),
    },
    subtitle: {
      fontSize: fs(isTablet ? 24 : 20),
    },
    description: {
      fontSize: fs(isSmallPhone ? 13 : 14),
    },
    inputContainer: {
      paddingHorizontal: sp(isTablet ? 20 : 16),
      marginBottom: sp(isTablet ? 20 : 16),
    },
    input: {
      height: sp(isTablet ? 56 : 50),
      fontSize: fs(isTablet ? 18 : 16),
    },
    loginButton: {
      height: sp(isTablet ? 56 : 50),
      marginTop: sp(isTablet ? 12 : 8),
    },
    loginButtonText: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    iconSize: isTablet ? 24 : 20,
    logoIconSize: isTablet ? 72 : isSmallPhone ? 48 : 64,
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, dynamicStyles.scrollContainer]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.logoContainer, dynamicStyles.logoContainer]}>
            <Ionicons name="bicycle" size={dynamicStyles.logoIconSize} color={Colors.primary} />
          </View>
          <Text style={[styles.title, dynamicStyles.title]}>Frito Lay</Text>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Repartidor</Text>
          <Text style={[styles.description, dynamicStyles.description]}>
            Inicia sesión para gestionar tus entregas
          </Text>
        </View>

        <View style={[styles.form, { width: '100%' }]}>
          <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
            <Ionicons 
              name="mail-outline" 
              size={dynamicStyles.iconSize} 
              color={Colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Correo electrónico"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
            <Ionicons 
              name="lock-closed-outline" 
              size={dynamicStyles.iconSize} 
              color={Colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Contraseña"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={dynamicStyles.iconSize} 
                color={Colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton, 
              dynamicStyles.loginButton,
              isLoading && styles.loginButtonDisabled
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={[styles.loginButtonText, dynamicStyles.loginButtonText]}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.md,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  loginButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
});
