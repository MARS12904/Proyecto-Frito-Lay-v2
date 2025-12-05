import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, BorderRadius, Shadows } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { fs, sp, wp, isTablet, isSmallPhone } = useResponsive();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  // Estilos dinámicos responsive
  const dynamicStyles = {
    contentContainer: {
      maxWidth: isTablet ? 600 : undefined,
      alignSelf: isTablet ? 'center' as const : undefined,
      width: isTablet ? '100%' : undefined,
    },
    header: {
      padding: sp(isTablet ? 40 : 32),
    },
    avatarContainer: {
      width: sp(isTablet ? 120 : 100),
      height: sp(isTablet ? 120 : 100),
      borderRadius: sp(isTablet ? 60 : 50),
    },
    avatarIconSize: isTablet ? 56 : 48,
    name: {
      fontSize: fs(isTablet ? 28 : 24),
    },
    email: {
      fontSize: fs(isTablet ? 16 : 14),
    },
    section: {
      marginTop: sp(isTablet ? 20 : 16),
      paddingVertical: sp(isTablet ? 12 : 8),
    },
    sectionTitle: {
      fontSize: fs(isTablet ? 20 : 18),
      paddingHorizontal: sp(isTablet ? 20 : 16),
      paddingVertical: sp(isTablet ? 16 : 12),
    },
    infoRow: {
      padding: sp(isTablet ? 20 : 16),
    },
    infoIconSize: isTablet ? 24 : 20,
    infoContent: {
      marginLeft: sp(isTablet ? 20 : 16),
    },
    infoLabel: {
      fontSize: fs(isTablet ? 14 : 12),
    },
    infoValue: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    menuItem: {
      padding: sp(isTablet ? 20 : 16),
    },
    menuIconSize: isTablet ? 28 : 24,
    menuText: {
      fontSize: fs(isTablet ? 18 : 16),
      marginLeft: sp(isTablet ? 20 : 16),
    },
    chevronSize: isTablet ? 24 : 20,
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={dynamicStyles.contentContainer}
    >
      <View style={[styles.header, dynamicStyles.header]}>
        <View style={[styles.avatarContainer, dynamicStyles.avatarContainer]}>
          <Ionicons name="person" size={dynamicStyles.avatarIconSize} color={Colors.primary} />
        </View>
        <Text style={[styles.name, dynamicStyles.name]}>{user?.name || 'Repartidor'}</Text>
        <Text style={[styles.email, dynamicStyles.email]}>{user?.email}</Text>
      </View>

      <View style={[styles.section, dynamicStyles.section]}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Información Personal</Text>
        
        <View style={[styles.infoRow, dynamicStyles.infoRow]}>
          <Ionicons name="mail-outline" size={dynamicStyles.infoIconSize} color={Colors.textSecondary} />
          <View style={[styles.infoContent, dynamicStyles.infoContent]}>
            <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Correo</Text>
            <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{user?.email}</Text>
          </View>
        </View>

        {user?.phone && (
          <View style={[styles.infoRow, dynamicStyles.infoRow]}>
            <Ionicons name="call-outline" size={dynamicStyles.infoIconSize} color={Colors.textSecondary} />
            <View style={[styles.infoContent, dynamicStyles.infoContent]}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Teléfono</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{user.phone}</Text>
            </View>
          </View>
        )}

        {user?.license_number && (
          <View style={[styles.infoRow, dynamicStyles.infoRow]}>
            <Ionicons name="card-outline" size={dynamicStyles.infoIconSize} color={Colors.textSecondary} />
            <View style={[styles.infoContent, dynamicStyles.infoContent]}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Licencia</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{user.license_number}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.section, dynamicStyles.section]}>
        <TouchableOpacity style={[styles.menuItem, dynamicStyles.menuItem]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={dynamicStyles.menuIconSize} color={Colors.error} />
          <Text style={[styles.menuText, dynamicStyles.menuText, { color: Colors.error }]}>
            Cerrar Sesión
          </Text>
          <Ionicons name="chevron-forward" size={dynamicStyles.chevronSize} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  avatarContainer: {
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Shadows.md,
  },
  name: {
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    color: Colors.textSecondary,
  },
  section: {
    backgroundColor: Colors.backgroundCard,
  },
  sectionTitle: {
    fontWeight: '600',
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    color: Colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuText: {
    color: Colors.text,
    flex: 1,
  },
});
