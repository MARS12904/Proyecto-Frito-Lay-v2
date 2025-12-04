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

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

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
    switch (status) {
      case 'assigned':
        return '#FFA500';
      case 'in_transit':
        return '#007AFF';
      case 'delivered':
        return '#34C759';
      case 'failed':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Asignado';
      case 'in_transit':
        return 'En Tránsito';
      case 'delivered':
        return 'Entregado';
      case 'failed':
        return 'Fallido';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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
    <ScrollView style={styles.container}>
      {/* Estado del Pedido */}
      <View style={styles.statusSection}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(assignment.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(assignment.status) },
            ]}
          >
            {getStatusText(assignment.status)}
          </Text>
        </View>
        <Text style={styles.orderNumber}>
          Pedido #{order?.order_number || 'N/A'}
        </Text>
      </View>

      {/* Información del Cliente */}
      {order?.customer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Cliente</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>{order.customer.name}</Text>
            </View>
          </View>

          {order.customer.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>{order.customer.phone}</Text>
              </View>
            </View>
          )}

          {order.customer.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#007AFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{order.customer.email}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Información de Entrega */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de Entrega</Text>
        
        {order?.delivery_address && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Dirección de Entrega</Text>
              <Text style={styles.infoValue}>{order.delivery_address}</Text>
              {order.delivery_zone && (
                <Text style={[styles.infoValue, { marginTop: 4, fontSize: 14, color: '#666' }]}>
                  Zona: {order.delivery_zone}
                </Text>
              )}
              {order.delivery_reference && (
                <Text style={[styles.infoValue, { marginTop: 4, fontSize: 14, color: '#666' }]}>
                  Referencia: {order.delivery_reference}
                </Text>
              )}
            </View>
          </View>
        )}

        {order?.delivery_date && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fecha de Entrega</Text>
              <Text style={styles.infoValue}>
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
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Horario</Text>
              <Text style={styles.infoValue}>{order.delivery_time_slot}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={20} color="#007AFF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Total</Text>
            <Text style={styles.infoValue}>
              S/. {order?.total?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
      </View>

      {/* Notas e Indicaciones Adicionales */}
      {order?.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción e Indicaciones Adicionales</Text>
          <Text style={styles.notesText}>{order.notes}</Text>
        </View>
      )}

      {/* Items del Pedido */}
      {order?.items && order.items.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                {item.product_brand && (
                  <Text style={styles.itemBrand}>{item.product_brand}</Text>
                )}
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemQuantity}>
                  Cantidad: <Text style={styles.itemQuantityBold}>{item.quantity}</Text>
                </Text>
                <Text style={styles.itemSubtotal}>
                  S/. {item.subtotal.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos</Text>
          <Text style={styles.emptyText}>No hay productos en este pedido</Text>
        </View>
      )}

      {/* Foto de Entrega */}
      {assignment.delivery_photo_url && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto de Entrega</Text>
          <Text style={styles.photoUrl}>{assignment.delivery_photo_url}</Text>
        </View>
      )}

      {/* Acciones */}
      <View style={styles.actionsSection}>
        {assignment.status === 'assigned' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => updateStatus('in_transit')}
            disabled={isUpdating}
          >
            <Ionicons name="play-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Iniciar Entrega</Text>
          </TouchableOpacity>
        )}

        {assignment.status === 'in_transit' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSuccess]}
              onPress={() => updateStatus('delivered')}
              disabled={isUpdating}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Marcar como Entregado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={takeDeliveryPhoto}
              disabled={isUpdating}
            >
              <Ionicons name="camera-outline" size={20} color="#007AFF" />
              <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>
                Tomar Foto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={trackLocation}
              disabled={isUpdating}
            >
              <Ionicons name="location-outline" size={20} color="#007AFF" />
              <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>
                Registrar Ubicación
              </Text>
            </TouchableOpacity>
          </>
        )}

        {assignment.status !== 'delivered' && assignment.status !== 'failed' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger]}
            onPress={() => updateStatus('failed')}
            disabled={isUpdating}
          >
            <Ionicons name="close-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Marcar como Fallido</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    color: '#999',
  },
  statusSection: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemQuantityBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  itemSubtotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  photoUrl: {
    fontSize: 12,
    color: '#007AFF',
  },
  actionsSection: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  actionButtonSuccess: {
    backgroundColor: '#34C759',
  },
  actionButtonDanger: {
    backgroundColor: '#FF3B30',
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});



