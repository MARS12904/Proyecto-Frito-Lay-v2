import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { FormSheetModal } from '../../components/ui/FormSheetModal';
import { AppButton } from '../../components/ui/AppButton';
import { ActionRow, ActionRowGroup } from '../../components/ui/ActionRow';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { DeliveryAddress } from '../../data/userStorage';

const deliveryAreas = [
  { id: 'lima-centro', name: 'Lima Centro', fee: 0 },
  { id: 'lima-norte', name: 'Lima Norte', fee: 5 },
  { id: 'lima-sur', name: 'Lima Sur', fee: 5 },
  { id: 'lima-este', name: 'Lima Este', fee: 8 },
  { id: 'callao', name: 'Callao', fee: 3 },
  { id: 'provincias', name: 'Provincias', fee: 15 },
];

export default function DeliveryAddressesScreen() {
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const { horizontalPadding, scaleFont, contentMaxWidth } = useResponsive();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(user?.deliveryAddresses || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [formData, setFormData] = useState({
    address: '',
    zone: '',
    notes: '',
  });

  useEffect(() => {
    const loadAddresses = async () => {
      if (!user) return;

      // Verificar si el usuario tiene UUID válido (está en Supabase)
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      if (isValidUUID) {
        // Cargar desde la tabla delivery_addresses
        try {
          const { deliveryAddressesService } = await import('../../services/deliveryAddressesService');
          const addressesFromTable = await deliveryAddressesService.getAddresses(user.id);
          
          if (addressesFromTable.length > 0) {
            setAddresses(addressesFromTable);
            // NO actualizar JSONB - las direcciones están en la tabla
          } else if (user.deliveryAddresses && user.deliveryAddresses.length > 0) {
            // Si hay direcciones en JSONB pero no en la tabla, migrar a la tabla
            await deliveryAddressesService.syncFromJSONB(user.id, user.deliveryAddresses);
            const syncedAddresses = await deliveryAddressesService.getAddresses(user.id);
            setAddresses(syncedAddresses);
            // NO actualizar JSONB - las direcciones ya están en la tabla
          } else {
            setAddresses([]);
          }
        } catch (error) {
          console.error('Error loading addresses from table:', error);
          // Fallback a direcciones del perfil local
          if (user.deliveryAddresses) {
            setAddresses(user.deliveryAddresses);
          }
        }
      } else {
        // Usar direcciones del perfil local (JSONB)
        if (user.deliveryAddresses) {
          setAddresses(user.deliveryAddresses);
        }
      }
    };

    loadAddresses();
  }, [user]);

  const handleSave = async () => {
    if (!formData.address.trim()) {
      Alert.alert('Error', 'La dirección es requerida');
      return;
    }

    if (!formData.zone) {
      Alert.alert('Error', 'Selecciona una zona de entrega');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    // Verificar si el usuario tiene UUID válido (está en Supabase)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    
    if (isValidUUID) {
      // Usar la tabla delivery_addresses
      try {
        const { deliveryAddressesService } = await import('../../services/deliveryAddressesService');
        
        if (editingAddress) {
          // Actualizar dirección existente
          console.log('Actualizando dirección:', { userId: user.id, addressId: editingAddress.id });
          const success = await deliveryAddressesService.updateAddress(
            user.id,
            editingAddress.id,
            {
              address: formData.address.trim(),
              zone: formData.zone,
              notes: formData.notes.trim() || undefined,
              isDefault: addresses.length === 0 || editingAddress.isDefault || false,
            }
          );

          if (success) {
            console.log('Dirección actualizada exitosamente');
            // Recargar direcciones desde Supabase
            const updatedAddresses = await deliveryAddressesService.getAddresses(user.id);
            setAddresses(updatedAddresses);
            // NO actualizar JSONB - las direcciones están en la tabla
            setShowAddModal(false);
            setEditingAddress(null);
            resetForm();
            Alert.alert('Éxito', 'Dirección actualizada correctamente');
          } else {
            console.error('Error: updateAddress retornó false');
            Alert.alert('Error', 'No se pudo actualizar la dirección. Revisa la consola para más detalles.');
          }
        } else {
          // Crear nueva dirección
          console.log('Guardando nueva dirección:', { userId: user.id, zone: formData.zone });
          const addressId = await deliveryAddressesService.saveAddress(user.id, {
            address: formData.address.trim(),
            zone: formData.zone,
            notes: formData.notes.trim() || undefined,
            isDefault: addresses.length === 0 || false,
          });

          if (addressId) {
            console.log('Dirección guardada exitosamente:', addressId);
            // Recargar direcciones desde Supabase
            const updatedAddresses = await deliveryAddressesService.getAddresses(user.id);
            setAddresses(updatedAddresses);
            // NO actualizar JSONB - las direcciones están en la tabla
            setShowAddModal(false);
            resetForm();
            Alert.alert('Éxito', 'Dirección guardada correctamente');
          } else {
            console.error('Error: saveAddress retornó null');
            Alert.alert('Error', 'No se pudo guardar la dirección. Revisa la consola para más detalles.');
          }
        }
      } catch (error) {
        console.error('Error en handleSave (delivery addresses):', error);
        Alert.alert('Error', `Error al guardar dirección: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    } else {
      // Fallback a JSONB en user_profiles (modo local)
      const newAddress: DeliveryAddress = {
        id: editingAddress?.id || Date.now().toString(),
        address: formData.address.trim(),
        zone: formData.zone,
        notes: formData.notes.trim() || undefined,
        isDefault: addresses.length === 0 || editingAddress?.isDefault || false,
      };

      let updatedAddresses: DeliveryAddress[];
      if (editingAddress) {
        updatedAddresses = addresses.map(a => a.id === editingAddress.id ? newAddress : a);
      } else {
        updatedAddresses = [...addresses, newAddress];
      }

      const success = await updateProfile({ deliveryAddresses: updatedAddresses });
      if (success) {
        setAddresses(updatedAddresses);
        setShowAddModal(false);
        setEditingAddress(null);
        resetForm();
      } else {
        Alert.alert('Error', 'No se pudo guardar la dirección');
      }
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    Alert.alert(
      'Eliminar Dirección',
      '¿Estás seguro de que quieres eliminar esta dirección?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Verificar si el usuario tiene UUID válido (está en Supabase)
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
            
            if (isValidUUID) {
              // Eliminar de la tabla delivery_addresses
              const { deliveryAddressesService } = await import('../../services/deliveryAddressesService');
              const success = await deliveryAddressesService.deleteAddress(user.id, addressId);
              
              if (success) {
                // Recargar direcciones desde Supabase
                const updatedAddresses = await deliveryAddressesService.getAddresses(user.id);
                setAddresses(updatedAddresses);
                // NO actualizar JSONB - las direcciones están en la tabla
              } else {
                Alert.alert('Error', 'No se pudo eliminar la dirección');
              }
            } else {
              // Fallback a JSONB (modo local)
              const updatedAddresses = addresses.filter(a => a.id !== addressId);
              const success = await updateProfile({ deliveryAddresses: updatedAddresses });
              if (success) {
                setAddresses(updatedAddresses);
              } else {
                Alert.alert('Error', 'No se pudo eliminar la dirección');
              }
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    // Verificar si el usuario tiene UUID válido (está en Supabase)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    
    if (isValidUUID) {
      // Actualizar en la tabla delivery_addresses
      const { deliveryAddressesService } = await import('../../services/deliveryAddressesService');
      const success = await deliveryAddressesService.updateAddress(user.id, addressId, { isDefault: true });
      
      if (success) {
        // Recargar direcciones desde Supabase
        const updatedAddresses = await deliveryAddressesService.getAddresses(user.id);
        setAddresses(updatedAddresses);
        // NO actualizar JSONB - las direcciones están en la tabla
      }
    } else {
      // Fallback a JSONB (modo local)
      const updatedAddresses = addresses.map(a => ({
        ...a,
        isDefault: a.id === addressId,
      }));
      const success = await updateProfile({ deliveryAddresses: updatedAddresses });
      if (success) {
        setAddresses(updatedAddresses);
      }
    }
  };

  const handleEdit = (address: DeliveryAddress) => {
    setEditingAddress(address);
    setFormData({
      address: address.address,
      zone: address.zone || '',
      notes: address.notes || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      address: '',
      zone: '',
      notes: '',
    });
  };

  const getZoneName = (zoneId: string) => {
    return deliveryAreas.find(area => area.id === zoneId)?.name || zoneId;
  };

  const getZoneFee = (zoneId: string) => {
    return deliveryAreas.find(area => area.id === zoneId)?.fee || 0;
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingAddress(null);
    resetForm();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Direcciones de entrega" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingBottom: insets.bottom + 100,
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          width: '100%',
        }}
      >
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color={Colors.light.textLight} />
            <Text style={styles.emptyText}>No tienes direcciones guardadas</Text>
            <Text style={styles.emptySubtext}>Agrega una para facilitar tus compras</Text>
          </View>
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={styles.addressInfo}>
                  <Ionicons name="location" size={24} color={Colors.light.primary} />
                  <View style={styles.addressDetails}>
                    <Text style={styles.addressText}>{address.address}</Text>
                    {address.zone && (
                      <Text style={styles.zoneText}>
                        {getZoneName(address.zone)} {getZoneFee(address.zone) === 0 ? '(Gratis)' : `(+S/ ${getZoneFee(address.zone)})`}
                      </Text>
                    )}
                    {address.notes && (
                      <Text style={styles.notesText}>{address.notes}</Text>
                    )}
                  </View>
                </View>
                {address.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Predeterminada</Text>
                  </View>
                )}
              </View>
              <ActionRowGroup>
                {!address.isDefault && (
                  <ActionRow
                    icon="star-outline"
                    label="Predeterminada"
                    onPress={() => handleSetDefault(address.id)}
                    color={Colors.light.primary}
                  />
                )}
                <ActionRow
                  icon="create-outline"
                  label="Editar"
                  onPress={() => handleEdit(address)}
                  color={Colors.light.secondary}
                />
                <ActionRow
                  icon="trash-outline"
                  label="Eliminar"
                  onPress={() => handleDelete(address.id)}
                  color={Colors.light.error}
                />
              </ActionRowGroup>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, paddingHorizontal: horizontalPadding }]}>
        <AppButton
          label="Agregar dirección"
          onPress={() => {
            resetForm();
            setEditingAddress(null);
            setShowAddModal(true);
          }}
          icon={<Ionicons name="add" size={22} color={Colors.light.background} />}
        />
      </View>

      <FormSheetModal
        visible={showAddModal}
        title={editingAddress ? 'Editar dirección' : 'Nueva dirección'}
        onClose={closeModal}
      >
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Zona de entrega *</Text>
          <View style={styles.zoneButtons}>
            {deliveryAreas.map((area) => (
              <TouchableOpacity
                key={area.id}
                style={[
                  styles.zoneButton,
                  formData.zone === area.id && styles.zoneButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, zone: area.id })}
              >
                <Text
                  style={[
                    styles.zoneButtonText,
                    { fontSize: scaleFont(13) },
                    formData.zone === area.id && styles.zoneButtonTextActive,
                  ]}
                  numberOfLines={2}
                >
                  {area.name} {area.fee === 0 ? '(Gratis)' : `(+S/ ${area.fee})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Dirección completa *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Ej: Av. Arequipa 123, Miraflores, Lima"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Notas (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Instrucciones para la entrega..."
            multiline
            numberOfLines={2}
          />
        </View>

        <AppButton label="Guardar" onPress={handleSave} />
      </FormSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  content: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: Spacing.md,
    ...Shadows.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    color: Colors.light.text,
    marginTop: Spacing.md,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  addressCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  addressInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  addressDetails: {
    marginLeft: Spacing.md,
    flex: 1,
    minWidth: 0,
  },
  addressText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
    flexShrink: 1,
  },
  zoneText: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  defaultBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.light.background,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  zoneButtons: {
    gap: Spacing.sm,
  },
  zoneButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  zoneButtonActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  zoneButtonText: {
    color: Colors.light.text,
    flexShrink: 1,
  },
  zoneButtonTextActive: {
    color: Colors.light.background,
    fontWeight: '600',
  },
});

