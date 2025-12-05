import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DeliveryService, DeliveryAssignment } from '../../services/deliveryService';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, BorderRadius, Shadows, DeliveryStatusColors, DeliveryStatusText } from '../../constants/theme';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { fs, sp, wp, isTablet, isSmallPhone, isLandscape } = useResponsive();

  useEffect(() => {
    loadAssignment();
  }, [id]);

  const loadAssignment = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const data = await DeliveryService.getAssignment(id);
      setAssignment(data);
    } catch (error) {
      console.error('Error loading assignment:', error);
      Alert.alert('Error', 'No se pudo cargar el pedido');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (newStatus: 'in_transit' | 'delivered' | 'failed') => {
    if (!assignment || !id) return;

    let confirmMessage = '';
    if (newStatus === 'in_transit') {
      confirmMessage = '¿Marcar pedido como "En Tránsito"?';
    } else if (newStatus === 'delivered') {
      confirmMessage = '¿Marcar pedido como "Entregado"?';
    } else {
      confirmMessage = '¿Marcar pedido como "Fallido"?';
    }

    Alert.alert('Confirmar', confirmMessage, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            setIsUpdating(true);
            const success = await DeliveryService.updateAssignmentStatus(id, newStatus);
            
            if (success) {
              await loadAssignment();
              Alert.alert('Éxito', 'Estado actualizado correctamente');
            } else {
              Alert.alert('Error', 'No se pudo actualizar el estado');
            }
          } catch (error) {
            Alert.alert('Error', 'Error al actualizar el estado');
          } finally {
            setIsUpdating(false);
          }
        },
      },
    ]);
  };

  const takeDeliveryPhoto = async () => {
    if (!assignment || !id) return;

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesita acceso a la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUpdating(true);
        const photoUrl = await DeliveryService.uploadDeliveryPhoto(
          id,
          result.assets[0].uri
        );

        if (photoUrl) {
          await loadAssignment();
          Alert.alert('Éxito', 'Foto subida correctamente');
        } else {
          Alert.alert('Error', 'No se pudo subir la foto');
        }
        setIsUpdating(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Error al tomar la foto');
      setIsUpdating(false);
    }
  };

  const trackLocation = async () => {
    if (!assignment || !id) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesita acceso a la ubicación');
        return;
      }

      setIsUpdating(true);
      const location = await Location.getCurrentPositionAsync({});
      
      const success = await DeliveryService.trackLocation(
        id,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy
      );

      if (success) {
        Alert.alert('Éxito', 'Ubicación registrada correctamente');
      } else {
        Alert.alert('Error', 'No se pudo registrar la ubicación');
      }
      setIsUpdating(false);
    } catch (error) {
      console.error('Error tracking location:', error);
      Alert.alert('Error', 'Error al registrar la ubicación');
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    return DeliveryStatusColors[status as keyof typeof DeliveryStatusColors] || Colors.textSecondary;
  };

  const getStatusText = (status: string) => {
    return DeliveryStatusText[status] || status;
  };

  // Estilos dinámicos responsive
  const dynamicStyles = {
    contentContainer: {
      maxWidth: isTablet ? 700 : undefined,
      alignSelf: isTablet ? 'center' as const : undefined,
      width: isTablet ? '100%' : undefined,
    },
    statusSection: {
      padding: sp(isTablet ? 28 : 20),
    },
    statusBadge: {
      paddingHorizontal: sp(isTablet ? 20 : 16),
      paddingVertical: sp(isTablet ? 10 : 8),
    },
    statusText: {
      fontSize: fs(isTablet ? 16 : 14),
    },
    orderNumber: {
      fontSize: fs(isTablet ? 22 : 18),
    },
    section: {
      marginTop: sp(isTablet ? 20 : 16),
      padding: sp(isTablet ? 20 : 16),
    },
    sectionTitle: {
      fontSize: fs(isTablet ? 20 : 18),
      marginBottom: sp(isTablet ? 20 : 16),
    },
    infoRow: {
      marginBottom: sp(isTablet ? 20 : 16),
    },
    infoIconSize: isTablet ? 24 : 20,
    infoContent: {
      marginLeft: sp(isTablet ? 16 : 12),
    },
    infoLabel: {
      fontSize: fs(isTablet ? 14 : 12),
    },
    infoValue: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    itemRow: {
      paddingVertical: sp(isTablet ? 16 : 12),
    },
    itemName: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    itemBrand: {
      fontSize: fs(isTablet ? 16 : 14),
    },
    itemQuantity: {
      fontSize: fs(isTablet ? 16 : 14),
    },
    itemQuantityBold: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    itemSubtotal: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    notesText: {
      fontSize: fs(isTablet ? 16 : 14),
      lineHeight: fs(isTablet ? 24 : 20),
    },
    actionsSection: {
      padding: sp(isTablet ? 20 : 16),
      gap: sp(isTablet ? 16 : 12),
    },
    actionButton: {
      padding: sp(isTablet ? 18 : 16),
      gap: sp(isTablet ? 12 : 8),
    },
    actionButtonText: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    actionIconSize: isTablet ? 24 : 20,
    // Para tablets en landscape, mostrar acciones en grid
    actionsGrid: isTablet && isLandscape ? {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
    } : undefined,
    actionButtonGrid: isTablet && isLandscape ? {
      flex: 1,
      minWidth: wp(40),
    } : undefined,
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se encontró el pedido</Text>
      </View>
    );
  }

  const order = assignment.order;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={dynamicStyles.contentContainer}
    >
      {/* Estado del Pedido */}
      <View style={[styles.statusSection, dynamicStyles.statusSection]}>
        <View
          style={[
            styles.statusBadge,
            dynamicStyles.statusBadge,
            { backgroundColor: getStatusColor(assignment.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              dynamicStyles.statusText,
              { color: getStatusColor(assignment.status) },
            ]}
          >
            {getStatusText(assignment.status)}
          </Text>
        </View>
        <Text style={[styles.orderNumber, dynamicStyles.orderNumber]}>
          Pedido #{order?.order_number || 'N/A'}
        </Text>
      </View>

      {/* Información del Cliente */}
      {order?.customer && (
        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Información del Cliente</Text>
          
          <View style={[styles.infoRow, dynamicStyles.infoRow]}>
            <Ionicons name="person-outline" size={dynamicStyles.infoIconSize} color={Colors.primary} />
            <View style={[styles.infoContent, dynamicStyles.infoContent]}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Nombre</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{order.customer.name}</Text>
            </View>
          </View>

          {order.customer.phone && (
            <View style={[styles.infoRow, dynamicStyles.infoRow]}>
              <Ionicons name="call-outline" size={dynamicStyles.infoIconSize} color={Colors.primary} />
              <View style={[styles.infoContent, dynamicStyles.infoContent]}>
                <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Teléfono</Text>
                <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{order.customer.phone}</Text>
              </View>
            </View>
          )}

          {order.customer.email && (
            <View style={[styles.infoRow, dynamicStyles.infoRow]}>
              <Ionicons name="mail-outline" size={dynamicStyles.infoIconSize} color={Colors.primary} />
              <View style={[styles.infoContent, dynamicStyles.infoContent]}>
                <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Email</Text>
                <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{order.customer.email}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Información de Entrega */}
      <View style={[styles.section, dynamicStyles.section]}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Información de Entrega</Text>
        
        {/* Dirección de Entrega - Siempre mostrar esta sección */}
        <View style={[styles.infoRow, dynamicStyles.infoRow]}>
          <Ionicons name="location-outline" size={dynamicStyles.infoIconSize} color={Colors.primary} />
          <View style={[styles.infoContent, dynamicStyles.infoContent]}>
            <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Dirección de Entrega</Text>
            {order?.delivery_address ? (
              <>
                <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{order.delivery_address}</Text>
                {order.delivery_zone && (
                  <Text style={[styles.infoValueSecondary, { fontSize: fs(14) }]}>
                    Zona: {order.delivery_zone}
                  </Text>
                )}
                {order.delivery_reference && (
                  <Text style={[styles.infoValueSecondary, { fontSize: fs(14) }]}>
                    Referencia: {order.delivery_reference}
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.infoValueSecondary, { fontSize: fs(14), fontStyle: 'italic' }]}>
                No hay dirección registrada
              </Text>
            )}
          </View>
        </View>

        {order?.delivery_date && (
          <View style={[styles.infoRow, dynamicStyles.infoRow]}>
            <Ionicons name="calendar-outline" size={dynamicStyles.infoIconSize} color={Colors.primary} />
            <View style={[styles.infoContent, dynamicStyles.infoContent]}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Fecha de Entrega</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>
                {new Date(order.delivery_date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        )}

        {order?.delivery_time_slot && (
          <View style={[styles.infoRow, dynamicStyles.infoRow]}>
            <Ionicons name="time-outline" size={dynamicStyles.infoIconSize} color={Colors.primary} />
            <View style={[styles.infoContent, dynamicStyles.infoContent]}>
              <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Horario</Text>
              <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{order.delivery_time_slot}</Text>
            </View>
          </View>
        )}

        <View style={[styles.infoRow, dynamicStyles.infoRow]}>
          <Ionicons name="cash-outline" size={dynamicStyles.infoIconSize} color={Colors.primary} />
          <View style={[styles.infoContent, dynamicStyles.infoContent]}>
            <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Total</Text>
            <Text style={[styles.infoValue, dynamicStyles.infoValue, { color: Colors.success, fontWeight: 'bold' }]}>
              S/. {order?.total?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
      </View>

      {/* Notas e Indicaciones Adicionales */}
      {order?.notes && (
        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Descripción e Indicaciones Adicionales</Text>
          <Text style={[styles.notesText, dynamicStyles.notesText]}>{order.notes}</Text>
        </View>
      )}

      {/* Items del Pedido */}
      {order?.items && order.items.length > 0 ? (
        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Productos</Text>
          {order.items.map((item) => (
            <View key={item.id} style={[styles.itemRow, dynamicStyles.itemRow]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, dynamicStyles.itemName]}>{item.product_name}</Text>
                {item.product_brand && (
                  <Text style={[styles.itemBrand, dynamicStyles.itemBrand]}>{item.product_brand}</Text>
                )}
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemQuantity, dynamicStyles.itemQuantity]}>
                  Cantidad: <Text style={[styles.itemQuantityBold, dynamicStyles.itemQuantityBold]}>{item.quantity}</Text>
                </Text>
                <Text style={[styles.itemSubtotal, dynamicStyles.itemSubtotal]}>
                  S/. {item.subtotal.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Productos</Text>
          <Text style={styles.emptyText}>No hay productos en este pedido</Text>
        </View>
      )}

      {/* Foto de Entrega */}
      {assignment.delivery_photo_url && (
        <View style={[styles.section, dynamicStyles.section]}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Foto de Entrega</Text>
          <Text style={styles.photoUrl}>{assignment.delivery_photo_url}</Text>
        </View>
      )}

      {/* Acciones */}
      <View style={[styles.actionsSection, dynamicStyles.actionsSection, dynamicStyles.actionsGrid]}>
        {assignment.status === 'assigned' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary, dynamicStyles.actionButton, dynamicStyles.actionButtonGrid]}
            onPress={() => updateStatus('in_transit')}
            disabled={isUpdating}
          >
            <Ionicons name="play-outline" size={dynamicStyles.actionIconSize} color={Colors.white} />
            <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText]}>Iniciar Entrega</Text>
          </TouchableOpacity>
        )}

        {assignment.status === 'in_transit' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSuccess, dynamicStyles.actionButton, dynamicStyles.actionButtonGrid]}
              onPress={() => updateStatus('delivered')}
              disabled={isUpdating}
            >
              <Ionicons name="checkmark-circle-outline" size={dynamicStyles.actionIconSize} color={Colors.white} />
              <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText]}>Marcar como Entregado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary, dynamicStyles.actionButton, dynamicStyles.actionButtonGrid]}
              onPress={takeDeliveryPhoto}
              disabled={isUpdating}
            >
              <Ionicons name="camera-outline" size={dynamicStyles.actionIconSize} color={Colors.primary} />
              <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText, { color: Colors.primary }]}>
                Tomar Foto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary, dynamicStyles.actionButton, dynamicStyles.actionButtonGrid]}
              onPress={trackLocation}
              disabled={isUpdating}
            >
              <Ionicons name="location-outline" size={dynamicStyles.actionIconSize} color={Colors.primary} />
              <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText, { color: Colors.primary }]}>
                Registrar Ubicación
              </Text>
            </TouchableOpacity>
          </>
        )}

        {assignment.status !== 'delivered' && assignment.status !== 'failed' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger, dynamicStyles.actionButton, dynamicStyles.actionButtonGrid]}
            onPress={() => updateStatus('failed')}
            disabled={isUpdating}
          >
            <Ionicons name="close-circle-outline" size={dynamicStyles.actionIconSize} color={Colors.white} />
            <Text style={[styles.actionButtonText, dynamicStyles.actionButtonText]}>Marcar como Fallido</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  statusSection: {
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    marginBottom: 12,
  },
  statusText: {
    fontWeight: '600',
  },
  orderNumber: {
    fontWeight: '600',
    color: Colors.text,
  },
  section: {
    backgroundColor: Colors.backgroundCard,
  },
  sectionTitle: {
    fontWeight: '600',
    color: Colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  infoValueSecondary: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  itemBrand: {
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  itemQuantityBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  itemSubtotal: {
    fontWeight: '600',
    color: Colors.text,
  },
  notesText: {
    color: Colors.textSecondary,
  },
  emptyText: {
    color: Colors.textLight,
    textAlign: 'center',
  },
  photoUrl: {
    fontSize: 12,
    color: Colors.primary,
  },
  actionsSection: {},
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  actionButtonSuccess: {
    backgroundColor: Colors.success,
  },
  actionButtonDanger: {
    backgroundColor: Colors.error,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontWeight: '600',
    color: Colors.white,
  },
});
