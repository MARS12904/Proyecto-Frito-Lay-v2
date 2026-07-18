import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import { 
  Alert, 
  Image, 
  ScrollView, 
  StyleSheet, 
  Switch, 
  Text, 
  TouchableOpacity, 
  View,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useMetrics } from '../../contexts/MetricsContext';
import { userProfileService } from '../../services/userProfileService';
import { 
  Colors, 
  Spacing, 
  FontSizes, 
  BorderRadius, 
  Shadows, 
  responsive 
} from '../../constants/theme';
import { useAppColors } from '../../contexts/ThemeContext';
import { openSupportWhatsApp } from '../../utils/linking';
import { useResponsive } from '../../hooks/useResponsive';


const { width: screenWidth } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const { clearCart, isWholesaleMode } = useCart();
  const { getUserMetrics, reloadMetrics } = useMetrics();
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.preferences?.notifications ?? true
  );
  const [darkModeEnabled, setDarkModeEnabled] = useState(
    user?.preferences?.theme === 'dark'
  );
  const colors = useAppColors();
  const styles = getStyles(colors);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { headerPaddingTop } = useResponsive();
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Recargar métricas cuando el usuario cambia o cuando se monta el componente
  useEffect(() => {
    if (user?.id) {
      reloadMetrics(user.id);
    }
  }, [user?.id]);

  // Obtener métricas reales del usuario
  const merchantStats = user ? getUserMetrics(user.id) : {
    totalOrders: 0,
    totalSpent: 0,
    totalSavings: 0,
    averageOrderValue: 0,
    monthlyGoal: 5000,
    monthlyProgress: 0,
    topProducts: [],
    recentActivity: [],
  };

  const handleImagePicker = async () => {
    if (!user) return;

    Alert.alert(
      'Cambiar foto de perfil',
      'Selecciona una opción',
      [
        {
          text: 'Tomar foto',
          onPress: async () => {
            // Solicitar permisos de cámara
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permisos requeridos', 'Se necesitan permisos de cámara para tomar fotos.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              await uploadImage(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Elegir de galería',
          onPress: async () => {
            // Solicitar permisos de galería
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              await uploadImage(result.assets[0].uri);
            }
          },
        },
        ...(user.profileImage ? [{
          text: 'Eliminar foto',
          style: 'destructive' as const,
          onPress: async () => {
            setIsUploadingImage(true);
            try {
              const success = await userProfileService.deleteProfileImage(user.id);
              if (success) {
                await updateProfile({ profileImage: undefined });
                Alert.alert('Éxito', 'Foto de perfil eliminada');
              } else {
                Alert.alert('Error', 'No se pudo eliminar la foto');
              }
            } catch (error) {
              console.error('Error deleting image:', error);
              Alert.alert('Error', 'Ocurrió un error al eliminar la foto');
            } finally {
              setIsUploadingImage(false);
            }
          },
        }] : []),
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const uploadImage = async (imageUri: string) => {
    if (!user) return;

    setIsUploadingImage(true);
    try {
      const imageUrl = await userProfileService.uploadProfileImage(user.id, imageUri);
      
      if (imageUrl) {
        await updateProfile({ profileImage: imageUrl });
        Alert.alert('Éxito', 'Foto de perfil actualizada correctamente');
      } else {
        Alert.alert('Error', 'No se pudo subir la imagen. Verifica tu conexión.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Ocurrió un error al subir la imagen');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleChangePassword = () => {
    router.push('/profile/change-password');
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión', 
          style: 'destructive',
          onPress: async () => {
            // No limpiar el carrito al cerrar sesión, se mantiene por usuario
            await logout();
            router.replace('/auth/login');
          }
        }
      ]
    );
  };

  const handleDarkModeToggle = async (value: boolean) => {
    setDarkModeEnabled(value);
    const success = await updateProfile({
      preferences: {
        notifications: notificationsEnabled,
        theme: value ? 'dark' : 'light',
      },
    });
    if (!success) {
      Alert.alert('Error', 'No se pudo cambiar el tema');
      setDarkModeEnabled(!value);
    }
  };

  const handleContact = () => openSupportWhatsApp(user?.name);

  const handleHelp = () => {
    Alert.alert(
      'Centro de ayuda',
      '¿Sobre qué necesitas orientación?',
      [
        {
          text: 'Cómo comprar',
          onPress: () => Alert.alert(
            'Cómo comprar',
            'Ingresa al catálogo, agrega productos al carrito, programa tu entrega y confirma el pago.'
          ),
        },
        {
          text: 'Pagos y entregas',
          onPress: () => Alert.alert(
            'Pagos y entregas',
            'Puedes pagar con tarjeta, transferencia, crédito comercial o efectivo contra entrega, según disponibilidad.'
          ),
        },
        {
          text: 'Hablar con soporte',
          onPress: () => openSupportWhatsApp(user?.name),
        },
        {
          text: 'Cerrar',
          style: 'cancel',
        },
      ]
    );
  };

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    const success = await updateProfile({
      preferences: {
        notifications: value,
        theme: darkModeEnabled ? 'dark' : 'light',
      },
    });
    if (!success) {
      Alert.alert('Error', 'Error al actualizar las preferencias');
      setNotificationsEnabled(!value);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>Error: Usuario no encontrado</Text>
        </View>
      </View>
    );
  }

  const progressPercentage = merchantStats.monthlyGoal > 0 
    ? (merchantStats.monthlyProgress / merchantStats.monthlyGoal) * 100 
    : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: headerPaddingTop + Spacing.lg, backgroundColor: colors.backgroundCard }]}>
        <View style={styles.profileImageContainer}>
          {isUploadingImage ? (
            <View style={[styles.defaultProfileImage, styles.uploadingContainer]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.defaultProfileImage}>
              <Ionicons name="business" size={responsive({ xs: 32, sm: 36, md: 40 })} color={colors.primary} />
            </View>
          )}
          <TouchableOpacity 
            style={[styles.editImageButton, isUploadingImage && styles.editImageButtonDisabled]} 
            onPress={handleImagePicker}
            disabled={isUploadingImage}
          >
            <Ionicons name="camera" size={responsive({ xs: 12, sm: 14, md: 16 })} color={Colors.light.background} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
          {user.phone ? (
            <Text style={[styles.phone, { color: colors.textSecondary }]}>
              <Ionicons name="call-outline" size={14} /> {user.phone}
            </Text>
          ) : null}
          {isWholesaleMode && (
            <View style={styles.merchantBadge}>
              <Ionicons name="business" size={responsive({ xs: 12, sm: 14, md: 16 })} color={Colors.light.primary} />
              <Text style={styles.merchantBadgeText}>Comerciante Verificado</Text>
            </View>
          )}
        </View>
      </View>

      {/* Dashboard de comerciante */}
      <View style={styles.dashboardSection}>
        <Text style={styles.sectionTitle}>Dashboard de Negocio</Text>
        
        {/* Estadísticas principales */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="receipt" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.primary} />
            </View>
            <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {merchantStats.totalOrders}
            </Text>
            <Text style={styles.statLabel}>Pedidos</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cash" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.success} />
            </View>
            <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              S/ {merchantStats.totalSpent.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Gastado</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="trending-down" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.warning} />
            </View>
            <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              S/ {merchantStats.totalSavings.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Ahorrado</Text>
          </View>
        </View>

        {/* Progreso mensual */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Meta Mensual</Text>
            <Text style={styles.progressValue}>
              S/ {merchantStats.monthlyProgress.toFixed(0)} / S/ {merchantStats.monthlyGoal.toFixed(0)}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(progressPercentage, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressPercentage}>
            {progressPercentage.toFixed(1)}% completado
          </Text>
        </View>

        {/* Productos top */}
        {merchantStats.topProducts.length > 0 && (
          <View style={styles.topProductsCard}>
            <Text style={styles.cardTitle}>Productos Más Vendidos</Text>
            {merchantStats.topProducts.slice(0, 3).map((product, index) => (
              <View key={index} style={styles.productItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productQuantity}>{product.quantity} unidades</Text>
                </View>
                <Text style={styles.productRevenue}>S/ {product.revenue.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actividad reciente */}
        {merchantStats.recentActivity.length > 0 && (
          <View style={styles.activityCard}>
            <Text style={styles.cardTitle}>Actividad Reciente</Text>
            {merchantStats.recentActivity.slice(0, 3).map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons 
                    name={activity.type === 'order' ? 'receipt' : activity.type === 'payment' ? 'card' : 'refresh'} 
                    size={responsive({ xs: 14, sm: 16 })} 
                    color={Colors.light.primary} 
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityDescription} numberOfLines={1}>{activity.description}</Text>
                  <Text style={styles.activityDate}>{activity.date}</Text>
                </View>
                <Text style={styles.activityAmount}>S/ {activity.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Sección de información personal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="person-outline" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.primary} />
            </View>
            <Text style={styles.menuItemText}>Editar Perfil</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsive({ xs: 16, sm: 18, md: 20 })} color={Colors.light.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="lock-closed-outline" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.primary} />
            </View>
            <Text style={styles.menuItemText}>Cambiar Contraseña</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsive({ xs: 16, sm: 18, md: 20 })} color={Colors.light.textLight} />
        </TouchableOpacity>
      </View>

      {/* Sección de métodos de pago */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Métodos de Pago</Text>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/profile/payment-methods')}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="card-outline" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.primary} />
            </View>
            <Text style={styles.menuItemText}>
              Gestionar Métodos de Pago
              {user?.paymentMethods && user.paymentMethods.length > 0 && (
                <Text style={styles.badgeText}> ({user.paymentMethods.length})</Text>
              )}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={responsive({ xs: 16, sm: 18, md: 20 })} color={Colors.light.textLight} />
        </TouchableOpacity>
      </View>

      {/* Sección de direcciones de entrega */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Direcciones de Entrega</Text>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/profile/delivery-addresses')}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="location-outline" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.primary} />
            </View>
            <Text style={styles.menuItemText}>
              Gestionar Direcciones
              {user?.deliveryAddresses && user.deliveryAddresses.length > 0 && (
                <Text style={styles.badgeText}> ({user.deliveryAddresses.length})</Text>
              )}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={responsive({ xs: 16, sm: 18, md: 20 })} color={Colors.light.textLight} />
        </TouchableOpacity>
      </View>

      {/* Sección de preferencias */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="notifications-outline" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.primary} />
            </View>
            <Text style={styles.menuItemText}>Notificaciones</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            thumbColor={notificationsEnabled ? Colors.light.background : Colors.light.textLight}
          />
        </View>

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="moon-outline" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.secondary} />
            </View>
            <Text style={styles.menuItemText}>Modo Oscuro</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={handleDarkModeToggle}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={darkModeEnabled ? colors.background : colors.textLight}
          />
        </View>
      </View>

      {/* Sección de soporte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soporte</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="help-circle-outline" size={responsive({ xs: 20, sm: 22, md: 24 })} color={Colors.light.success} />
            </View>
            <Text style={styles.menuItemText}>Ayuda</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsive({ xs: 16, sm: 18, md: 20 })} color={Colors.light.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleContact}>
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="logo-whatsapp" size={responsive({ xs: 20, sm: 22, md: 24 })} color="#25D366" />
            </View>
            <Text style={styles.menuItemText}>Contacto WhatsApp</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsive({ xs: 16, sm: 18, md: 20 })} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowAboutModal(true)}>
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="information-circle-outline" size={responsive({ xs: 20, sm: 22, md: 24 })} color={colors.success} />
            </View>
            <Text style={styles.menuItemText}>Acerca de</Text>
          </View>
          <Ionicons name="chevron-forward" size={responsive({ xs: 16, sm: 18, md: 20 })} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Botón de cerrar sesión */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={responsive({ xs: 20, sm: 22, md: 24 })} color={colors.error} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAboutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.aboutOverlay}>
          <View style={styles.aboutModal}>
            <View style={styles.aboutHeader}>
              <Ionicons name="business-outline" size={28} color={colors.primary} />
              <Text style={styles.aboutTitle}>LayGo Comerciantes</Text>
            </View>

            <Text style={styles.aboutText}>
              Somos una plataforma orientada al reabastecimiento de negocios, bodegas y comerciantes que necesitan gestionar pedidos de productos Frito-Lay de forma rápida, ordenada y confiable.
            </Text>

            <Text style={styles.aboutText}>
              La app permite revisar catálogo, armar pedidos, programar entregas, gestionar métodos de pago y hacer seguimiento desde un solo lugar.
            </Text>

            <TouchableOpacity
              style={styles.aboutButton}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={styles.aboutButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Espaciado inferior */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: colors.error,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // Header
  header: {
    backgroundColor: colors.backgroundCard,
    paddingBottom: responsive({ xs: 24, sm: 28, md: 32 }),
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  profileImage: {
    width: responsive({ xs: 80, sm: 90, md: 100 }),
    height: responsive({ xs: 80, sm: 90, md: 100 }),
    borderRadius: responsive({ xs: 40, sm: 45, md: 50 }),
  },
  defaultProfileImage: {
    width: responsive({ xs: 80, sm: 90, md: 100 }),
    height: responsive({ xs: 80, sm: 90, md: 100 }),
    borderRadius: responsive({ xs: 40, sm: 45, md: 50 }),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: responsive({ xs: 12, sm: 14, md: 15 }),
    width: responsive({ xs: 24, sm: 28, md: 30 }),
    height: responsive({ xs: 24, sm: 28, md: 30 }),
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  editImageButtonDisabled: {
    opacity: 0.5,
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  userInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: responsive({ xs: 20, sm: 22, md: 24 }),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  email: {
    fontSize: responsive({ xs: 14, sm: 15, md: 16 }),
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  phone: {
    fontSize: responsive({ xs: 13, sm: 14, md: 15 }),
    marginBottom: Spacing.sm,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  merchantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  merchantBadgeText: {
    fontSize: responsive({ xs: 10, sm: 11, md: 12 }),
    color: colors.primary,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },

  // Dashboard section
  dashboardSection: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: responsive({ xs: 18, sm: 20, md: 22 }),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: Spacing.lg,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.backgroundCard,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statIconContainer: {
    width: responsive({ xs: 36, sm: 40, md: 44 }),
    height: responsive({ xs: 36, sm: 40, md: 44 }),
    borderRadius: responsive({ xs: 18, sm: 20, md: 22 }),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statNumber: {
    fontSize: responsive({ xs: 16, sm: 18, md: 20 }),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: responsive({ xs: 10, sm: 11, md: 12 }),
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Progress card
  progressCard: {
    backgroundColor: colors.backgroundCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    fontSize: responsive({ xs: 16, sm: 17, md: 18 }),
    fontWeight: '600',
    color: colors.text,
  },
  progressValue: {
    fontSize: responsive({ xs: 14, sm: 15, md: 16 }),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressBar: {
    height: responsive({ xs: 6, sm: 7, md: 8 }),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressPercentage: {
    fontSize: responsive({ xs: 12, sm: 13, md: 14 }),
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Cards
  topProductsCard: {
    backgroundColor: colors.backgroundCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  activityCard: {
    backgroundColor: colors.backgroundCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: responsive({ xs: 16, sm: 17, md: 18 }),
    fontWeight: '600',
    color: colors.text,
    marginBottom: Spacing.md,
  },

  // Product items
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  productName: {
    fontSize: responsive({ xs: 14, sm: 15, md: 16 }),
    color: colors.text,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  productQuantity: {
    fontSize: responsive({ xs: 12, sm: 13, md: 14 }),
    color: colors.textSecondary,
  },
  productRevenue: {
    fontSize: responsive({ xs: 14, sm: 15, md: 16 }),
    color: colors.success,
    fontWeight: '600',
  },

  // Activity items
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    width: responsive({ xs: 32, sm: 36, md: 40 }),
    height: responsive({ xs: 32, sm: 36, md: 40 }),
    borderRadius: responsive({ xs: 16, sm: 18, md: 20 }),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  activityDescription: {
    fontSize: responsive({ xs: 14, sm: 15, md: 16 }),
    color: colors.text,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  activityDate: {
    fontSize: responsive({ xs: 12, sm: 13, md: 14 }),
    color: colors.textSecondary,
  },
  activityAmount: {
    fontSize: responsive({ xs: 14, sm: 15, md: 16 }),
    color: colors.success,
    fontWeight: '600',
  },

  // Sections
  section: {
    backgroundColor: colors.backgroundCard,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: responsive({ xs: 36, sm: 40, md: 44 }),
    height: responsive({ xs: 36, sm: 40, md: 44 }),
    borderRadius: responsive({ xs: 18, sm: 20, md: 22 }),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    fontSize: responsive({ xs: 14, sm: 15, md: 16 }),
    color: colors.text,
    fontWeight: '500',
  },
  badgeText: {
    fontSize: responsive({ xs: 12, sm: 13, md: 14 }),
    color: colors.textSecondary,
    fontWeight: '400',
  },

  // Logout section
  logoutSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    ...Shadows.sm,
  },
  logoutButtonText: {
    fontSize: responsive({ xs: 14, sm: 15, md: 16 }),
    color: colors.error,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },

  //Modal
  aboutOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    aboutModal: {
      width: '100%',
      backgroundColor: colors.backgroundCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      ...Shadows.lg,
    },
    aboutHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    aboutTitle: {
      fontSize: FontSizes.xl,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: Spacing.sm,
    },
    aboutText: {
      fontSize: FontSizes.md,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: Spacing.md,
    },
    aboutButton: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    aboutButtonText: {
      color: colors.background,
      fontSize: FontSizes.md,
      fontWeight: '600',
    },

  // Bottom spacing
  bottomSpacing: {
    height: responsive({ xs: 20, sm: 24, md: 28 }),
  },
});