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
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { useStock } from '../../contexts/StockContext';
import { useMetrics } from '../../contexts/MetricsContext';
import AuthGuard from '../../components/AuthGuard';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import * as WebBrowser from 'expo-web-browser';
import { PAYMENT_LINK_URL } from '../../constants/payments';
import { router } from 'expo-router';
import { paymentMethodsService } from '../../services/paymentMethodsService';
import { PaymentMethod as SavedPaymentMethod } from '../../data/userStorage';
import { sendOrderConfirmationEmail } from '../../services/emailService';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'transfer' | 'cash' | 'credit';
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  available: boolean;
  processingFee?: number;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'card',
    name: 'Tarjeta de Crédito/Débito',
    type: 'card',
    icon: 'card-outline',
    description: 'Visa, Mastercard, American Express',
    available: true,
    processingFee: 0.035, // 3.5%
  },
  {
    id: 'transfer',
    name: 'Transferencia Bancaria',
    type: 'transfer',
    icon: 'business-outline',
    description: 'Transferencia directa a cuenta Frito-Lay',
    available: true,
    processingFee: 0,
  },
  {
    id: 'credit',
    name: 'Crédito Comercial',
    type: 'credit',
    icon: 'document-text-outline',
    description: 'Pago a 30 días para comerciantes registrados',
    available: true,
    processingFee: 0,
  },
  {
    id: 'cash',
    name: 'Efectivo contra Entrega',
    type: 'cash',
    icon: 'cash-outline',
    description: 'Pago en efectivo al recibir el pedido',
    available: true,
    processingFee: 0,
  },
];

export default function PaymentsScreen() {
  return (
    <AuthGuard>
      <PaymentsContent />
    </AuthGuard>
  );
}

function PaymentsContent() {
  const { 
    items, 
    totalPrice, 
    clearCart, 
    isWholesaleMode, 
    getCartSummary,
    deliverySchedule,
    validateOrder 
  } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();
  const { reduceStock } = useStock();
  const { updateMetrics } = useMetrics();
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string | null>(null);
  const [useDifferentMethod, setUseDifferentMethod] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });
  const [bankDetails, setBankDetails] = useState({
    bank: '',
    account: '',
    reference: '',
  });

  const cartSummary = getCartSummary();
  const orderValidation = validateOrder();

  // Función para seleccionar un método guardado
  const handleSelectSavedMethod = (methodId: string) => {
    setSelectedSavedMethod(methodId);
    setUseDifferentMethod(false);
    setSelectedMethod(''); // Limpiar selección de método genérico
    
    const savedMethod = savedPaymentMethods.find(m => m.id === methodId);
    if (savedMethod) {
      // Pre-llenar datos según el tipo
      if (savedMethod.type === 'card' && savedMethod.details) {
        setSelectedMethod('card');
        setCardDetails({
          number: savedMethod.details.cardNumber || '',
          expiry: savedMethod.details.expiryDate || '',
          cvv: '', // No guardamos CVV por seguridad
          name: savedMethod.name,
        });
      } else if (savedMethod.type === 'transfer' && savedMethod.details) {
        setSelectedMethod('transfer');
        setBankDetails({
          bank: savedMethod.details.bank || '',
          account: savedMethod.details.accountNumber || '',
          reference: '', // La referencia se ingresa en cada compra
        });
      } else {
        // Para cash o credit, solo seleccionar el tipo
        setSelectedMethod(savedMethod.type);
      }
    }
  };

  // Función para usar un método diferente
  const handleUseDifferentMethod = () => {
    setUseDifferentMethod(true);
    setSelectedSavedMethod(null);
    setSelectedMethod('');
    setCardDetails({ number: '', expiry: '', cvv: '', name: '' });
    setBankDetails({ bank: '', account: '', reference: '' });
  };

  // Cargar métodos de pago guardados
  useEffect(() => {
    const loadSavedPaymentMethods = async () => {
      if (!user?.id) return;

      try {
        const methods = await paymentMethodsService.getPaymentMethods(user.id);
        setSavedPaymentMethods(methods);
        
        // Si hay un método por defecto, seleccionarlo automáticamente
        const defaultMethod = methods.find(m => m.isDefault);
        if (defaultMethod) {
          // Seleccionar directamente sin usar la función para evitar dependencias
          setSelectedSavedMethod(defaultMethod.id);
          setUseDifferentMethod(false);
          setSelectedMethod('');
          
          // Pre-llenar datos según el tipo
          if (defaultMethod.type === 'card' && defaultMethod.details) {
            setSelectedMethod('card');
            setCardDetails({
              number: defaultMethod.details.cardNumber || '',
              expiry: defaultMethod.details.expiryDate || '',
              cvv: '',
              name: defaultMethod.name,
            });
          } else if (defaultMethod.type === 'transfer' && defaultMethod.details) {
            setSelectedMethod('transfer');
            setBankDetails({
              bank: defaultMethod.details.bank || '',
              account: defaultMethod.details.accountNumber || '',
              reference: '',
            });
          } else {
            setSelectedMethod(defaultMethod.type);
          }
        }
      } catch (error) {
        console.error('Error loading saved payment methods:', error);
      }
    };

    loadSavedPaymentMethods();
  }, [user?.id]);

  const openPaymentLink = async () => {
    try {
      await WebBrowser.openBrowserAsync(PAYMENT_LINK_URL);
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir la pasarela de pago');
    }
  };

  const processPayment = async () => {
    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    try {
      // Determinar el nombre del método de pago
      let paymentMethodName = 'Desconocido';
      if (selectedSavedMethod && !useDifferentMethod) {
        const savedMethod = savedPaymentMethods.find(m => m.id === selectedSavedMethod);
        paymentMethodName = savedMethod?.name || 'Método guardado';
      } else {
        const currentMethod = paymentMethods.find(m => m.id === selectedMethod);
        paymentMethodName = currentMethod?.name || 'Desconocido';
      }

      // 1. Verificar y reducir stock disponible (ahora sí se reduce al procesar el pago)
      for (const item of items) {
        const stockAvailable = await reduceStock(item.product.id, item.quantity);
        if (!stockAvailable) {
          Alert.alert(
            'Stock Insuficiente', 
            `No hay suficiente stock para ${item.product.name}. Stock disponible: ${item.product.stock}`
          );
          return;
        }
      }

      // 2. Crear el pedido
      const orderItems = items.map(item => ({
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        weight: item.product.weight,
      }));

      const cartSummary = getCartSummary();
      const orderId = await addOrder({
        total: cartSummary.finalTotal,
        wholesaleTotal: cartSummary.totalPrice,
        savings: cartSummary.wholesaleSavings,
        items: orderItems,
        deliveryDate: deliverySchedule?.date,
        deliveryAddress: deliverySchedule?.address,
        deliveryTimeSlot: deliverySchedule?.timeSlot,
        paymentMethod: paymentMethodName,
        isWholesale: isWholesaleMode,
        userId: user.id,
      });

      // 3. Actualizar métricas del usuario
      await updateMetrics(user.id, {
        total: cartSummary.finalTotal,
        savings: cartSummary.wholesaleSavings,
        items: orderItems,
      });

      // 4. Enviar correo de confirmación
      const orderForEmail = {
        id: orderId,
        date: new Date().toISOString().split('T')[0],
        status: 'pending' as const,
        total: cartSummary.finalTotal,
        wholesaleTotal: cartSummary.totalPrice,
        savings: cartSummary.wholesaleSavings,
        items: orderItems,
        deliveryDate: deliverySchedule?.date,
        deliveryAddress: deliverySchedule?.address,
        deliveryTimeSlot: deliverySchedule?.timeSlot,
        paymentMethod: paymentMethodName,
        isWholesale: isWholesaleMode,
        userId: user.id,
      };

      // Enviar email en segundo plano (no bloquear el flujo)
      sendOrderConfirmationEmail(orderForEmail, user.email, user.name)
        .then((success) => {
          if (success) {
            console.log('📧 Email de confirmación enviado exitosamente');
          } else {
            console.warn('⚠️ No se pudo enviar el email de confirmación');
          }
        })
        .catch((error) => {
          console.error('❌ Error enviando email:', error);
        });

      // 5. Limpiar carrito y programación de entrega
      clearCart();
      // Nota: clearCart ya limpia el deliverySchedule, pero lo hacemos explícito

      // 6. Mostrar confirmación
      Alert.alert(
        '¡Pago Exitoso!',
        `Tu pedido ${orderId} ha sido procesado exitosamente.\n\nTotal: S/ ${cartSummary.finalTotal.toFixed(2)}\n\nHemos enviado un correo de confirmación a ${user.email}.`,
        [
          {
            text: 'Ver Pedidos',
            onPress: () => router.push('/(tabs)/orders')
          },
          {
            text: 'Continuar Comprando',
            onPress: () => router.push('/(tabs)/catalog')
          }
        ]
      );

    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Hubo un problema procesando tu pago. Por favor intenta nuevamente.');
    }
  };

  const handlePayment = () => {
    // Validar el pedido primero
    if (!orderValidation.isValid) {
      Alert.alert('Error en el Pedido', orderValidation.errors.join('\n'));
      return;
    }

    // Si se seleccionó un método guardado, validar que esté completo
    if (selectedSavedMethod && !useDifferentMethod) {
      const savedMethod = savedPaymentMethods.find(m => m.id === selectedSavedMethod);
      if (savedMethod) {
        if (savedMethod.type === 'card') {
          if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
            Alert.alert('Error', 'Por favor ingresa el CVV de la tarjeta (3 o 4 dígitos)');
            return;
          }
        }
        if (savedMethod.type === 'transfer' && !bankDetails.reference) {
          Alert.alert('Error', 'Ingresa el número de operación de la transferencia');
          return;
        }
      }
    } else {
      // Validación para método nuevo
      if (!selectedMethod) {
        Alert.alert('Error', 'Selecciona un método de pago');
        return;
      }

      const selectedPaymentMethod = paymentMethods.find(m => m.id === selectedMethod);
      if (!selectedPaymentMethod?.available) {
        Alert.alert('Error', 'Método de pago no disponible');
        return;
      }

      if (selectedMethod === 'card') {
        if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
          Alert.alert('Error', 'Completa todos los datos de la tarjeta');
          return;
        }
      }

      if (selectedMethod === 'transfer') {
        if (!bankDetails.bank || !bankDetails.account || !bankDetails.reference) {
          Alert.alert('Error', 'Completa todos los datos de la transferencia');
          return;
        }
      }
    }

    // Determinar el método de pago seleccionado
    let finalPaymentMethod;
    if (selectedSavedMethod && !useDifferentMethod) {
      const savedMethod = savedPaymentMethods.find(m => m.id === selectedSavedMethod);
      finalPaymentMethod = paymentMethods.find(m => m.id === savedMethod?.type);
    } else {
      finalPaymentMethod = paymentMethods.find(m => m.id === selectedMethod);
    }

    if (!finalPaymentMethod) {
      Alert.alert('Error', 'Método de pago no válido');
      return;
    }

    const processingFee = finalPaymentMethod.processingFee || 0;
    const finalTotal = cartSummary.finalTotal + (cartSummary.finalTotal * processingFee);

    const paymentMethodName = selectedSavedMethod && !useDifferentMethod
      ? savedPaymentMethods.find(m => m.id === selectedSavedMethod)?.name || finalPaymentMethod.name
      : finalPaymentMethod.name;

    Alert.alert(
      'Confirmar Pago',
      `¿Proceder con el pago de S/ ${finalTotal.toFixed(2)} usando ${paymentMethodName}?${
        processingFee > 0 ? `\n\nComisión: S/ ${(cartSummary.finalTotal * processingFee).toFixed(2)}` : ''
      }`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: () => {
            // Simular procesamiento de pago
            Alert.alert(
              'Procesando Pago...',
              'Por favor espera mientras procesamos tu pago.',
              [],
              { cancelable: false }
            );
            
            // Simular delay del procesamiento
            setTimeout(() => {
              processPayment();
            }, 2000);
          }
        }
      ]
    );
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const processingFeeText = method.processingFee && method.processingFee > 0 
      ? `Comisión: ${(method.processingFee * 100).toFixed(1)}%` 
      : '';

    return (
      <TouchableOpacity
        style={[
          styles.paymentMethodCard,
          selectedMethod === method.id && styles.paymentMethodCardSelected,
          !method.available && styles.paymentMethodCardDisabled
        ]}
        onPress={() => method.available && setSelectedMethod(method.id)}
        disabled={!method.available}
      >
        <View style={styles.paymentMethodHeader}>
          <Ionicons 
            name={method.icon} 
            size={24} 
            color={selectedMethod === method.id ? Colors.light.primary : Colors.light.textSecondary} 
          />
          <View style={styles.paymentMethodInfo}>
            <Text style={[
              styles.paymentMethodName,
              selectedMethod === method.id && styles.paymentMethodNameSelected,
              !method.available && styles.paymentMethodNameDisabled
            ]}>
              {method.name}
            </Text>
            <Text style={[
              styles.paymentMethodDescription,
              !method.available && styles.paymentMethodDescriptionDisabled
            ]}>
              {method.description}
            </Text>
            {processingFeeText ? (
              <Text style={styles.processingFee}>
                {processingFeeText}
              </Text>
            ) : null}
          </View>
          <View style={[
            styles.radioButton,
            selectedMethod === method.id && styles.radioButtonSelected,
            !method.available && styles.radioButtonDisabled
          ]}>
            {selectedMethod === method.id && (
              <View style={styles.radioButtonInner} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Procesar Pago</Text>
        <Text style={styles.subtitle}>
          {isWholesaleMode ? 'Pago para comerciantes' : 'Pago minorista'}
        </Text>
      </View>

      {/* Resumen del pedido mejorado */}
      <View style={styles.orderSummary}>
        <Text style={styles.sectionTitle}>Resumen del Pedido</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemBrand}>{item.product.brand}</Text>
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>S/ {item.subtotal.toFixed(2)}</Text>
            </View>
          </View>
        ))}
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>S/ {cartSummary.totalPrice.toFixed(2)}</Text>
        </View>
        
        {isWholesaleMode && cartSummary.wholesaleSavings > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ahorro mayorista:</Text>
            <Text style={[styles.summaryValue, styles.savingsValue]}>
              -S/ {cartSummary.wholesaleSavings.toFixed(2)}
            </Text>
          </View>
        )}
        
        {cartSummary.deliveryFee > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Costo de envío:</Text>
            <Text style={styles.summaryValue}>S/ {cartSummary.deliveryFee.toFixed(2)}</Text>
          </View>
        )}
        
        {(() => {
          const currentMethod = selectedSavedMethod && !useDifferentMethod
            ? paymentMethods.find(m => m.id === savedPaymentMethods.find(sm => sm.id === selectedSavedMethod)?.type)
            : paymentMethods.find(m => m.id === selectedMethod);
          const fee = currentMethod?.processingFee || 0;
          
          return fee > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Comisión de procesamiento:</Text>
              <Text style={styles.summaryValue}>
                S/ {(cartSummary.finalTotal * fee).toFixed(2)}
              </Text>
            </View>
          ) : null;
        })()}
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalPrice}>
            S/ {(() => {
              const currentMethod = selectedSavedMethod && !useDifferentMethod
                ? paymentMethods.find(m => m.id === savedPaymentMethods.find(sm => sm.id === selectedSavedMethod)?.type)
                : paymentMethods.find(m => m.id === selectedMethod);
              const fee = currentMethod?.processingFee || 0;
              return (cartSummary.finalTotal + (cartSummary.finalTotal * fee)).toFixed(2);
            })()}
          </Text>
        </View>
      </View>

      {/* Información de entrega */}
      {deliverySchedule && (
        <View style={styles.deliveryInfo}>
          <Text style={styles.sectionTitle}>Información de Entrega</Text>
          <View style={styles.deliveryDetails}>
            <View style={styles.deliveryItem}>
              <Ionicons name="calendar" size={16} color={Colors.light.primary} />
              <Text style={styles.deliveryText}>{deliverySchedule.date}</Text>
            </View>
            <View style={styles.deliveryItem}>
              <Ionicons name="time" size={16} color={Colors.light.primary} />
              <Text style={styles.deliveryText}>{deliverySchedule.timeSlot}</Text>
            </View>
            <View style={styles.deliveryItem}>
              <Ionicons name="location" size={16} color={Colors.light.primary} />
              <Text style={styles.deliveryText}>{deliverySchedule.address}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Métodos de pago guardados */}
      {savedPaymentMethods.length > 0 && !useDifferentMethod && (
        <View style={styles.savedPaymentMethods}>
          <Text style={styles.sectionTitle}>Métodos de Pago Guardados</Text>
          {savedPaymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.savedMethodCard,
                selectedSavedMethod === method.id && styles.savedMethodCardSelected,
              ]}
              onPress={() => handleSelectSavedMethod(method.id)}
            >
              <View style={styles.savedMethodHeader}>
                <Ionicons 
                  name={
                    method.type === 'card' ? 'card-outline' :
                    method.type === 'transfer' ? 'business-outline' :
                    method.type === 'credit' ? 'document-text-outline' :
                    'cash-outline'
                  } 
                  size={24} 
                  color={selectedSavedMethod === method.id ? Colors.light.primary : Colors.light.textSecondary} 
                />
                <View style={styles.savedMethodInfo}>
                  <Text style={[
                    styles.savedMethodName,
                    selectedSavedMethod === method.id && styles.savedMethodNameSelected
                  ]}>
                    {method.name}
                  </Text>
                  <Text style={styles.savedMethodType}>
                    {method.type === 'card' ? 'Tarjeta de Crédito/Débito' :
                     method.type === 'transfer' ? 'Transferencia Bancaria' :
                     method.type === 'credit' ? 'Crédito Comercial' :
                     'Efectivo contra Entrega'}
                  </Text>
                  {method.details?.cardNumber && (
                    <Text style={styles.savedMethodDetails}>
                      **** {method.details.cardNumber.slice(-4)}
                    </Text>
                  )}
                  {method.details?.bank && (
                    <Text style={styles.savedMethodDetails}>
                      {method.details.bank}
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.radioButton,
                  selectedSavedMethod === method.id && styles.radioButtonSelected,
                ]}>
                  {selectedSavedMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
              {method.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Predeterminado</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.useDifferentButton}
            onPress={handleUseDifferentMethod}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.light.primary} />
            <Text style={styles.useDifferentButtonText}>Usar un método de pago diferente</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Métodos de pago genéricos (solo si no hay guardados o si eligió usar diferente) */}
      {(savedPaymentMethods.length === 0 || useDifferentMethod) && (
        <View style={styles.paymentMethods}>
          <Text style={styles.sectionTitle}>
            {savedPaymentMethods.length > 0 ? 'Seleccionar Método de Pago' : 'Métodos de Pago'}
          </Text>
          {paymentMethods.map((method) => (
            <View key={method.id}>
              {renderPaymentMethod(method)}
            </View>
          ))}
        </View>
      )}

      {((selectedMethod === 'card') || (selectedSavedMethod && savedPaymentMethods.find(m => m.id === selectedSavedMethod)?.type === 'card')) && (
        <View style={styles.cardDetails}>
          <Text style={styles.sectionTitle}>Datos de la Tarjeta</Text>
          
          {selectedSavedMethod && !useDifferentMethod ? (
            <>
              <View style={styles.savedMethodInfoBox}>
                <Text style={styles.savedMethodInfoText}>
                  Usando tarjeta guardada: {savedPaymentMethods.find(m => m.id === selectedSavedMethod)?.name}
                </Text>
                <Text style={styles.savedMethodInfoText}>
                  **** {savedPaymentMethods.find(m => m.id === selectedSavedMethod)?.details?.cardNumber?.slice(-4)}
                </Text>
              </View>
              <View style={styles.cvvNoticeBox}>
                <Ionicons name="lock-closed" size={16} color={Colors.light.warning} />
                <Text style={styles.cvvNoticeText}>
                  Por seguridad, el CVV no se guarda. Debes ingresarlo en cada compra.
                </Text>
              </View>
            </>
          ) : null}
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número de Tarjeta</Text>
            <TextInput
              style={styles.input}
              placeholder="1234 5678 9012 3456"
              value={cardDetails.number}
              onChangeText={(text) => setCardDetails(prev => ({ ...prev, number: text }))}
              keyboardType="numeric"
              maxLength={19}
              editable={!selectedSavedMethod || useDifferentMethod}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Fecha de Vencimiento</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/AA"
                value={cardDetails.expiry}
                onChangeText={(text) => setCardDetails(prev => ({ ...prev, expiry: text }))}
                keyboardType="numeric"
                maxLength={5}
                editable={!selectedSavedMethod || useDifferentMethod}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>
                CVV {selectedSavedMethod && !useDifferentMethod ? '*' : ''}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                value={cardDetails.cvv}
                onChangeText={(text) => setCardDetails(prev => ({ ...prev, cvv: text }))}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
              {selectedSavedMethod && !useDifferentMethod && (
                <Text style={styles.cvvRequiredText}>
                  Requerido para esta compra
                </Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre en la Tarjeta</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan Pérez"
                value={cardDetails.name}
                onChangeText={(text) => setCardDetails(prev => ({ ...prev, name: text }))}
                autoCapitalize="words"
                editable={!selectedSavedMethod || useDifferentMethod}
              />
          </View>
        </View>
      )}

      {((selectedMethod === 'transfer') || (selectedSavedMethod && savedPaymentMethods.find(m => m.id === selectedSavedMethod)?.type === 'transfer')) && (
        <View style={styles.transferDetails}>
          <Text style={styles.sectionTitle}>Datos de Transferencia</Text>
          
          <View style={styles.bankInfo}>
            <Text style={styles.bankInfoTitle}>Información de la Cuenta Frito-Lay</Text>
            <Text style={styles.bankInfoText}>Banco: Banco de Crédito del Perú</Text>
            <Text style={styles.bankInfoText}>Cuenta Corriente: 194-12345678-0-12</Text>
            <Text style={styles.bankInfoText}>CCI: 00219400123456780120</Text>
          </View>
          
          {selectedSavedMethod && !useDifferentMethod ? (
            <View style={styles.savedMethodInfoBox}>
              <Text style={styles.savedMethodInfoText}>
                Usando cuenta guardada: {savedPaymentMethods.find(m => m.id === selectedSavedMethod)?.name}
              </Text>
              <Text style={styles.savedMethodInfoText}>
                {savedPaymentMethods.find(m => m.id === selectedSavedMethod)?.details?.bank}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Banco de Origen</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Interbank, Scotiabank, etc."
                  value={bankDetails.bank}
                  onChangeText={(text) => setBankDetails(prev => ({ ...prev, bank: text }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Número de Cuenta</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Número de tu cuenta"
                  value={bankDetails.account}
                  onChangeText={(text) => setBankDetails(prev => ({ ...prev, account: text }))}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número de Operación</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de transferencia"
              value={bankDetails.reference}
              onChangeText={(text) => setBankDetails(prev => ({ ...prev, reference: text }))}
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      <View style={styles.securityInfo}>
        <Ionicons name="shield-checkmark" size={20} color={Colors.light.success} />
        <Text style={styles.securityText}>
          Tu información está protegida con encriptación SSL de 256 bits
        </Text>
      </View>

      <TouchableOpacity 
        style={[
          styles.payButton,
          !orderValidation.isValid && styles.payButtonDisabled
        ]} 
        onPress={handlePayment}
        disabled={!orderValidation.isValid}
      >
        <Text style={styles.payButtonText}>
          {(() => {
            const currentMethod = selectedSavedMethod && !useDifferentMethod
              ? paymentMethods.find(m => m.id === savedPaymentMethods.find(sm => sm.id === selectedSavedMethod)?.type)
              : paymentMethods.find(m => m.id === selectedMethod);
            const fee = currentMethod?.processingFee || 0;
            const total = cartSummary.finalTotal + (cartSummary.finalTotal * fee);
            return `Pagar S/ ${total.toFixed(2)}`;
          })()}
        </Text>
        <Ionicons name="arrow-forward" size={20} color={Colors.light.background} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
    ...Shadows.sm,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.light.textSecondary,
  },
  orderSummary: {
    backgroundColor: Colors.light.backgroundCard,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  itemBrand: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  itemPrice: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    fontWeight: '500',
  },
  savingsValue: {
    color: Colors.light.success,
  },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  totalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalPrice: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.light.success,
  },
  deliveryInfo: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  deliveryDetails: {
    gap: Spacing.sm,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deliveryText: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
  },
  paymentMethods: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  paymentMethodCard: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  paymentMethodCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  paymentMethodCardDisabled: {
    opacity: 0.5,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  paymentMethodName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  paymentMethodNameSelected: {
    color: Colors.light.primary,
  },
  paymentMethodNameDisabled: {
    color: Colors.light.textLight,
  },
  paymentMethodDescription: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
  },
  paymentMethodDescriptionDisabled: {
    color: Colors.light.textLight,
  },
  processingFee: {
    fontSize: FontSizes.xs,
    color: Colors.light.warning,
    marginTop: Spacing.xs,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.light.primary,
  },
  radioButtonDisabled: {
    borderColor: Colors.light.textLight,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primary,
  },
  cardDetails: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  transferDetails: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  bankInfo: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  bankInfoTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  bankInfoText: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    marginBottom: Spacing.md,
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
  row: {
    flexDirection: 'row',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.success,
  },
  securityText: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  payButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  payButtonText: {
    color: Colors.light.background,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  savedPaymentMethods: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  savedMethodCard: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  savedMethodCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  savedMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedMethodInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  savedMethodName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  savedMethodNameSelected: {
    color: Colors.light.primary,
  },
  savedMethodType: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  savedMethodDetails: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
  },
  defaultBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.light.background,
    fontWeight: '600',
  },
  useDifferentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    marginTop: Spacing.sm,
  },
  useDifferentButtonText: {
    fontSize: FontSizes.md,
    color: Colors.light.primary,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  savedMethodInfoBox: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  savedMethodInfoText: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  cvvNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.warning,
  },
  cvvNoticeText: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  cvvRequiredText: {
    fontSize: FontSizes.xs,
    color: Colors.light.warning,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
});
