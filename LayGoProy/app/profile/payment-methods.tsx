import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { PaymentMethod } from '../../data/userStorage';

export default function PaymentMethodsScreen() {
  const { user, updateProfile } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(user?.paymentMethods || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    type: 'card' as 'card' | 'transfer' | 'cash' | 'credit',
    name: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    bank: '',
    accountNumber: '',
  });

  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!user) return;

      // Verificar si el usuario tiene UUID válido (está en Supabase)
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      if (isValidUUID) {
        // Cargar desde la tabla payment_methods
        try {
          const { paymentMethodsService } = await import('../../services/paymentMethodsService');
          const methodsFromTable = await paymentMethodsService.getPaymentMethods(user.id);
          
          if (methodsFromTable.length > 0) {
            setPaymentMethods(methodsFromTable);
            // NO actualizar JSONB - los métodos están en la tabla
          } else if (user.paymentMethods && user.paymentMethods.length > 0) {
            // Si hay métodos en JSONB pero no en la tabla, migrar a la tabla
            await paymentMethodsService.syncFromJSONB(user.id, user.paymentMethods);
            const syncedMethods = await paymentMethodsService.getPaymentMethods(user.id);
            setPaymentMethods(syncedMethods);
            // NO actualizar JSONB - los métodos ya están en la tabla
          } else {
            setPaymentMethods([]);
          }
        } catch (error) {
          console.error('Error loading payment methods from table:', error);
          // Fallback a métodos del perfil local
          if (user.paymentMethods) {
            setPaymentMethods(user.paymentMethods);
          }
        }
      } else {
        // Usar métodos del perfil local (JSONB)
        if (user.paymentMethods) {
          setPaymentMethods(user.paymentMethods);
        }
      }
    };

    loadPaymentMethods();
  }, [user]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    if (formData.type === 'card' && (!formData.cardNumber || !formData.expiryDate || !formData.cvv)) {
      Alert.alert('Error', 'Completa todos los datos de la tarjeta, incluyendo el CVV');
      return;
    }
    
    if (formData.type === 'card' && formData.cvv.length < 3) {
      Alert.alert('Error', 'El CVV debe tener al menos 3 dígitos');
      return;
    }

    if (formData.type === 'transfer' && (!formData.bank || !formData.accountNumber)) {
      Alert.alert('Error', 'Completa todos los datos de la transferencia');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    // Verificar si el usuario tiene UUID válido (está en Supabase)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    
    if (isValidUUID) {
      // Usar la tabla payment_methods
      try {
        const { paymentMethodsService } = await import('../../services/paymentMethodsService');
        
        if (editingMethod) {
          // Actualizar método existente
          console.log('Actualizando método de pago:', { userId: user.id, methodId: editingMethod.id });
          const success = await paymentMethodsService.updatePaymentMethod(
            user.id,
            editingMethod.id,
            {
              type: formData.type,
              name: formData.name.trim(),
              details: formData.type === 'card' 
                ? { cardNumber: formData.cardNumber, expiryDate: formData.expiryDate }
                : formData.type === 'transfer'
                ? { bank: formData.bank, accountNumber: formData.accountNumber }
                : undefined,
              isDefault: paymentMethods.length === 0 || editingMethod.isDefault || false,
            }
          );

          if (success) {
            console.log('Método de pago actualizado exitosamente');
            // Recargar métodos desde Supabase
            const updatedMethods = await paymentMethodsService.getPaymentMethods(user.id);
            setPaymentMethods(updatedMethods);
            // NO actualizar JSONB - los métodos están en la tabla
            setShowAddModal(false);
            setEditingMethod(null);
            resetForm();
            Alert.alert('Éxito', 'Método de pago actualizado correctamente');
          } else {
            console.error('Error: updatePaymentMethod retornó false');
            Alert.alert('Error', 'No se pudo actualizar el método de pago. Revisa la consola para más detalles.');
          }
        } else {
          // Crear nuevo método
          console.log('Guardando nuevo método de pago:', { userId: user.id, type: formData.type });
          const methodId = await paymentMethodsService.savePaymentMethod(user.id, {
            type: formData.type,
            name: formData.name.trim(),
            details: formData.type === 'card' 
              ? { cardNumber: formData.cardNumber, expiryDate: formData.expiryDate }
              : formData.type === 'transfer'
              ? { bank: formData.bank, accountNumber: formData.accountNumber }
              : undefined,
            isDefault: paymentMethods.length === 0 || false,
          });

          if (methodId) {
            console.log('Método de pago guardado exitosamente:', methodId);
            // Recargar métodos desde Supabase
            const updatedMethods = await paymentMethodsService.getPaymentMethods(user.id);
            setPaymentMethods(updatedMethods);
            // NO actualizar JSONB - los métodos están en la tabla
            setShowAddModal(false);
            resetForm();
            Alert.alert('Éxito', 'Método de pago guardado correctamente');
          } else {
            console.error('Error: savePaymentMethod retornó null');
            Alert.alert('Error', 'No se pudo guardar el método de pago. Revisa la consola para más detalles.');
          }
        }
      } catch (error) {
        console.error('Error en handleSave (payment methods):', error);
        Alert.alert('Error', `Error al guardar método de pago: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    } else {
      // Fallback a JSONB en user_profiles (modo local)
      const newMethod: PaymentMethod = {
        id: editingMethod?.id || Date.now().toString(),
        type: formData.type,
        name: formData.name.trim(),
        details: formData.type === 'card' 
          ? { cardNumber: formData.cardNumber, expiryDate: formData.expiryDate }
          : formData.type === 'transfer'
          ? { bank: formData.bank, accountNumber: formData.accountNumber }
          : undefined,
        isDefault: paymentMethods.length === 0 || editingMethod?.isDefault || false,
      };

      let updatedMethods: PaymentMethod[];
      if (editingMethod) {
        updatedMethods = paymentMethods.map(m => m.id === editingMethod.id ? newMethod : m);
      } else {
        updatedMethods = [...paymentMethods, newMethod];
      }

      const success = await updateProfile({ paymentMethods: updatedMethods });
      if (success) {
        setPaymentMethods(updatedMethods);
        setShowAddModal(false);
        setEditingMethod(null);
        resetForm();
      } else {
        Alert.alert('Error', 'No se pudo guardar el método de pago');
      }
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    Alert.alert(
      'Eliminar Método de Pago',
      '¿Estás seguro de que quieres eliminar este método de pago?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Verificar si el usuario tiene UUID válido (está en Supabase)
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
            
            if (isValidUUID) {
              // Eliminar de la tabla payment_methods
              const { paymentMethodsService } = await import('../../services/paymentMethodsService');
              const success = await paymentMethodsService.deletePaymentMethod(user.id, methodId);
              
              if (success) {
                // Recargar métodos desde Supabase
                const updatedMethods = await paymentMethodsService.getPaymentMethods(user.id);
                setPaymentMethods(updatedMethods);
                // NO actualizar JSONB - los métodos están en la tabla
              } else {
                Alert.alert('Error', 'No se pudo eliminar el método de pago');
              }
            } else {
              // Fallback a JSONB (modo local)
              const updatedMethods = paymentMethods.filter(m => m.id !== methodId);
              const success = await updateProfile({ paymentMethods: updatedMethods });
              if (success) {
                setPaymentMethods(updatedMethods);
              } else {
                Alert.alert('Error', 'No se pudo eliminar el método de pago');
              }
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (methodId: string) => {
    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    // Verificar si el usuario tiene UUID válido (está en Supabase)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
    
    if (isValidUUID) {
      // Actualizar en la tabla payment_methods
      const { paymentMethodsService } = await import('../../services/paymentMethodsService');
      const success = await paymentMethodsService.updatePaymentMethod(user.id, methodId, { isDefault: true });
      
      if (success) {
        // Recargar métodos desde Supabase
        const updatedMethods = await paymentMethodsService.getPaymentMethods(user.id);
        setPaymentMethods(updatedMethods);
        // NO actualizar JSONB - los métodos están en la tabla
      }
    } else {
      // Fallback a JSONB (modo local)
      const updatedMethods = paymentMethods.map(m => ({
        ...m,
        isDefault: m.id === methodId,
      }));
      const success = await updateProfile({ paymentMethods: updatedMethods });
      if (success) {
        setPaymentMethods(updatedMethods);
      }
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      type: method.type,
      name: method.name,
      cardNumber: method.details?.cardNumber || '',
      expiryDate: method.details?.expiryDate || '',
      cvv: '', // CVV no se guarda por seguridad, se solicita en cada compra
      bank: method.details?.bank || '',
      accountNumber: method.details?.accountNumber || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'card',
      name: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      bank: '',
      accountNumber: '',
    });
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'card': return 'card-outline';
      case 'transfer': return 'business-outline';
      case 'credit': return 'document-text-outline';
      case 'cash': return 'cash-outline';
      default: return 'card-outline';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color={Colors.light.textLight} />
            <Text style={styles.emptyText}>No tienes métodos de pago guardados</Text>
            <Text style={styles.emptySubtext}>Agrega uno para facilitar tus compras</Text>
          </View>
        ) : (
          paymentMethods.map((method) => (
            <View key={method.id} style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <View style={styles.methodInfo}>
                  <Ionicons 
                    name={getMethodIcon(method.type) as any} 
                    size={24} 
                    color={Colors.light.primary} 
                  />
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodType}>
                      {method.type === 'card' ? 'Tarjeta' :
                       method.type === 'transfer' ? 'Transferencia' :
                       method.type === 'credit' ? 'Crédito Comercial' :
                       'Efectivo'}
                    </Text>
                    {method.details?.cardNumber && (
                      <Text style={styles.methodDetailsText}>
                        **** {method.details.cardNumber.slice(-4)}
                      </Text>
                    )}
                  </View>
                </View>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Predeterminado</Text>
                  </View>
                )}
              </View>
              <View style={styles.methodActions}>
                {!method.isDefault && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetDefault(method.id)}
                  >
                    <Ionicons name="star-outline" size={18} color={Colors.light.primary} />
                    <Text style={styles.actionButtonText}>Establecer como predeterminado</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(method)}
                >
                  <Ionicons name="create-outline" size={18} color={Colors.light.secondary} />
                  <Text style={styles.actionButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(method.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.light.error} />
                  <Text style={[styles.actionButtonText, { color: Colors.light.error }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setEditingMethod(null);
          setShowAddModal(true);
        }}
      >
        <Ionicons name="add" size={24} color={Colors.light.background} />
        <Text style={styles.addButtonText}>Agregar Método de Pago</Text>
      </TouchableOpacity>

      {/* Modal para agregar/editar */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMethod ? 'Editar' : 'Agregar'} Método de Pago
              </Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setEditingMethod(null);
                resetForm();
              }}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de Pago</Text>
                <View style={styles.typeButtons}>
                  {['card', 'transfer', 'credit', 'cash'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        formData.type === type && styles.typeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, type: type as any })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.type === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type === 'card' ? 'Tarjeta' :
                         type === 'transfer' ? 'Transferencia' :
                         type === 'credit' ? 'Crédito' :
                         'Efectivo'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Ej: Tarjeta Principal"
                />
              </View>

              {formData.type === 'card' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Número de Tarjeta *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.cardNumber}
                      onChangeText={(text) => setFormData({ ...formData, cardNumber: text })}
                      placeholder="1234 5678 9012 3456"
                      keyboardType="numeric"
                      maxLength={19}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Fecha de Vencimiento *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.expiryDate}
                      onChangeText={(text) => setFormData({ ...formData, expiryDate: text })}
                      placeholder="MM/AA"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CVV *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.cvv}
                      onChangeText={(text) => setFormData({ ...formData, cvv: text })}
                      placeholder="123"
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                    <Text style={styles.inputHint}>
                      El CVV se solicita para validar la tarjeta. No se guarda por seguridad.
                    </Text>
                  </View>
                </>
              )}

              {formData.type === 'transfer' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Banco *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.bank}
                      onChangeText={(text) => setFormData({ ...formData, bank: text })}
                      placeholder="Ej: Banco de Crédito del Perú"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Número de Cuenta *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.accountNumber}
                      onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
                      placeholder="Número de cuenta"
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: 50,
    backgroundColor: Colors.light.backgroundCard,
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
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
  methodCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  methodInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  methodDetails: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  methodName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  methodType: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  methodDetailsText: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
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
  methodActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  actionButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    marginLeft: Spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    padding: Spacing.lg,
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  addButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.background,
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  modalBody: {
    padding: Spacing.lg,
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
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  typeButtonActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  typeButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
  },
  typeButtonTextActive: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.background,
  },
  inputHint: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
});

