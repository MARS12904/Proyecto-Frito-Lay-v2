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
import { PaymentMethod } from '../../data/userStorage';
import { 
  PERU_PAYMENT_TYPES, 
  getPaymentTypeLabel, 
  validateCCI, 
  validatePeruPhone, 
  PaymentMethodType,
  DOCUMENT_TYPES,
  validateDNI,
  validateRUC
} from '../../constants/payments';
import { useAppColors } from '../../contexts/ThemeContext';

type FormData = {
  type: PaymentMethodType;
  name: string;
  cardNumber: string;
  expiryDate: string;
  bank: string;
  accountNumber: string;
  cci: string;
  walletPhone: string;
  holderName: string;
  documentType: 'dni' | 'ruc' | 'ce';
  documentNumber: string;
};

const buildDetails = (form: FormData) => {
  if (form.type === 'card') return { cardNumber: form.cardNumber, expiryDate: form.expiryDate };
  if (['yape', 'plin'].includes(form.type)) return { walletPhone: form.walletPhone, holderName: form.holderName };
  if (form.type === 'transfer' || form.type === 'deposit') {
    return { bank: form.bank, accountNumber: form.accountNumber, cci: form.cci, holderName: form.holderName, documentType: form.documentType, documentNumber: form.documentNumber };
  }
  return undefined;
};

export default function PaymentMethodsScreen() {
  const { user, updateProfile } = useAuth();
  const colors = useAppColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();

  const { horizontalPadding, scaleFont, contentMaxWidth } = useResponsive();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(user?.paymentMethods || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    type: 'yape' as PaymentMethodType,
    name: '',
    cardNumber: '',
    expiryDate: '',
    bank: '',
    accountNumber: '',
    cci: '',
    walletPhone: '',
    holderName: '',
    documentType: 'dni' as 'dni' | 'ruc' | 'ce',
    documentNumber: '',
  });

  const handleCardNumberChange = (text: string) => {
    const cleanText = text.replace(/\D/g, '');
    let formattedText = '';
    for (let i = 0; i < cleanText.length; i += 4) {
      if (i > 0) formattedText += ' ';
      formattedText += cleanText.slice(i, i + 4);
    }
    setFormData(prev => ({ ...prev, cardNumber: formattedText }));
  };

  const handleExpiryDateChange = (text: string) => {
    const cleanText = text.replace(/\D/g, '');
    let formattedText = cleanText;
    if (cleanText.length > 2) {
      formattedText = `${cleanText.slice(0, 2)}/${cleanText.slice(2, 4)}`;
    }
    setFormData(prev => ({ ...prev, expiryDate: formattedText }));
  };

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

    if (formData.type === 'card' && (!formData.cardNumber || !formData.expiryDate)) {
      Alert.alert('Error', 'Completa todos los datos de la tarjeta');
      return;
    }
    if (['yape', 'plin'].includes(formData.type) && !validatePeruPhone(formData.walletPhone)) {
      Alert.alert('Error', 'Ingresa un celular válido (9 dígitos)');
      return;
    }
    if (formData.type === 'transfer' && (!formData.bank || !formData.cci || !validateCCI(formData.cci))) {
      Alert.alert('Error', 'Completa banco y CCI válido (20 dígitos)');
      return;
    }
    if (formData.type === 'deposit' && (!formData.bank || !formData.holderName)) {
      Alert.alert('Error', 'Completa banco y titular');
      return;
    }
    if (formData.type === 'transfer' || formData.type === 'deposit') {
      if (!formData.holderName || !formData.documentNumber) {
        Alert.alert('Error', 'Completa el nombre del titular y su número de documento');
        return;
      }
      if (formData.documentType === 'dni' && !validateDNI(formData.documentNumber)) {
        Alert.alert('Error', 'DNI inválido (debe tener 8 dígitos)');
        return;
      }
      if (formData.documentType === 'ruc' && !validateRUC(formData.documentNumber)) {
        Alert.alert('Error', 'RUC inválido (debe tener 11 dígitos y empezar con 10 o 20)');
        return;
      }
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
              details: buildDetails(formData),
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
            details: buildDetails(formData),
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
        details: buildDetails(formData),
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
      bank: method.details?.bank || '',
      accountNumber: method.details?.accountNumber || '',
      cci: method.details?.cci || '',
      walletPhone: method.details?.walletPhone || '',
      holderName: method.details?.holderName || '',
      documentType: method.details?.documentType || 'dni',
      documentNumber: method.details?.documentNumber || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'yape',
      name: '',
      cardNumber: '',
      expiryDate: '',
      bank: '',
      accountNumber: '',
      cci: '',
      walletPhone: '',
      holderName: '',
      documentType: 'dni',
      documentNumber: '',
    });
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'yape':
      case 'plin': return 'phone-portrait-outline';
      case 'card': return 'card-outline';
      case 'transfer': return 'business-outline';
      case 'credit': return 'document-text-outline';
      case 'cash': return 'cash-outline';
      default: return 'card-outline';
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingMethod(null);
    resetForm();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Métodos de pago" />

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
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color={colors.textLight} />
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
                    color={colors.primary} 
                  />
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodType}>
                      {getPaymentTypeLabel(method.type as PaymentMethodType)}
                    </Text>
                    {method.details?.cardNumber ? (
                      <Text style={styles.methodDetailsText}>
                        **** {method.details.cardNumber.slice(-4)}
                      </Text>
                    ) : method.details?.walletPhone ? (
                      <Text style={styles.methodDetailsText}>
                        Cel: {method.details.walletPhone}
                      </Text>
                    ) : method.details?.cci ? (
                      <Text style={styles.methodDetailsText}>
                        {method.details.bank} - CCI: {method.details.cci}
                      </Text>
                    ) : method.details?.accountNumber ? (
                      <Text style={styles.methodDetailsText}>
                        {method.details.bank} - Cta: {method.details.accountNumber}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Predeterminado</Text>
                  </View>
                )}
              </View>
              <ActionRowGroup>
                {!method.isDefault && (
                  <ActionRow
                    icon="star-outline"
                    label="Predeterminado"
                    onPress={() => handleSetDefault(method.id)}
                    color={colors.primary}
                  />
                )}
                <ActionRow
                  icon="create-outline"
                  label="Editar"
                  onPress={() => handleEdit(method)}
                  color={colors.secondary}
                />
                <ActionRow
                  icon="trash-outline"
                  label="Eliminar"
                  onPress={() => handleDelete(method.id)}
                  color={colors.error}
                />
              </ActionRowGroup>

            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, paddingHorizontal: horizontalPadding }]}>
        <AppButton
          label="Agregar método de pago"
          onPress={() => {
            resetForm();
            setEditingMethod(null);
            setShowAddModal(true);
          }}
          icon={<Ionicons name="add" size={22} color={colors.background} />}
        />
      </View>

      <FormSheetModal
        visible={showAddModal}
        title={editingMethod ? 'Editar método' : 'Nuevo método de pago'}
        onClose={closeModal}
      >
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Tipo de pago</Text>
          <View style={styles.typeButtons}>
            {PERU_PAYMENT_TYPES.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.typeButton, formData.type === opt.id && styles.typeButtonActive]}
                onPress={() => setFormData({ ...formData, type: opt.id })}
              >
                <Text style={[styles.typeButtonText, { fontSize: scaleFont(11) }, formData.type === opt.id && styles.typeButtonTextActive]} numberOfLines={1}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Ej: Tarjeta principal"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {formData.type === 'card' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Número de tarjeta *</Text>
              <TextInput
                style={styles.input}
                value={formData.cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Vencimiento *</Text>
              <TextInput
                style={styles.input}
                value={formData.expiryDate}
                onChangeText={handleExpiryDateChange}
                placeholder="MM/AA"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </>
        )}

        {['yape', 'plin'].includes(formData.type) && (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Celular *</Text>
              <TextInput style={styles.input} value={formData.walletPhone} onChangeText={(t) => setFormData({ ...formData, walletPhone: t })} placeholder="9XXXXXXXX" placeholderTextColor={colors.textLight} keyboardType="phone-pad" maxLength={9} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Titular</Text>
              <TextInput style={styles.input} value={formData.holderName} onChangeText={(t) => setFormData({ ...formData, holderName: t })} placeholder="Nombre en la billetera" placeholderTextColor={colors.textLight} />
            </View>
          </>
        )}

        {(formData.type === 'transfer' || formData.type === 'deposit') && (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Banco *</Text>
              <TextInput style={styles.input} value={formData.bank} onChangeText={(t) => setFormData({ ...formData, bank: t })} placeholder="Ej: BCP" placeholderTextColor={colors.textLight} />
            </View>
            {formData.type === 'transfer' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>CCI * (20 dígitos)</Text>
                <TextInput style={styles.input} value={formData.cci} onChangeText={(t) => setFormData({ ...formData, cci: t })} placeholder="011XXXXXXXXXXXXXXX" placeholderTextColor={colors.textLight} keyboardType="numeric" maxLength={20} />
              </View>
            )}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Titular *</Text>
              <TextInput style={styles.input} value={formData.holderName} onChangeText={(t) => setFormData({ ...formData, holderName: t })} placeholder="Nombre del titular" placeholderTextColor={colors.textLight} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Tipo de Documento *</Text>
              <View style={styles.typeButtons}>
                {DOCUMENT_TYPES.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.typeButton, formData.documentType === doc.id && styles.typeButtonActive, { flexBasis: '28%', flexGrow: 0 }]}
                    onPress={() => setFormData({ ...formData, documentType: doc.id as any })}
                  >
                    <Text style={[styles.typeButtonText, { fontSize: scaleFont(11) }, formData.documentType === doc.id && styles.typeButtonTextActive]}>
                      {doc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { fontSize: scaleFont(13) }]}>Número de Documento *</Text>
              <TextInput
                style={styles.input}
                value={formData.documentNumber}
                onChangeText={(t) => setFormData({ ...formData, documentNumber: t.replace(/\D/g, '') })}
                placeholder={formData.documentType === 'ruc' ? "Ingresa RUC de 11 dígitos" : "Ingresa DNI de 8 dígitos"}
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                maxLength={formData.documentType === 'ruc' ? 11 : 8}
              />
            </View>
          </>
        )}


        <AppButton label="Guardar" onPress={handleSave} />
      </FormSheetModal>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    color: colors.text,
    marginTop: Spacing.md,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  methodCard: {
    backgroundColor: colors.backgroundCard,
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
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  methodType: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  methodDetailsText: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  defaultBadgeText: {
    fontSize: FontSizes.xs,
    color: colors.background,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeButton: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  typeButtonText: {
    color: colors.text,
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
});


