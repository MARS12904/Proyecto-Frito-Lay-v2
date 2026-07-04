import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { useCart, CartItem } from '../../contexts/CartContext';
import DeliveryScheduler from '../../components/DeliveryScheduler';
import ProductImage from '../../components/ProductImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, Dimensions as ThemeDimensions } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useAppColors } from '../../contexts/ThemeContext';
import { AppButton } from '../../components/ui/AppButton';

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateForDisplay = (dateStr: string): string => {
  try {
    const date = parseLocalDate(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export default function CartScreen() {
  return <CartContent />;
}

function CartContent() {
  const colors = useAppColors();
  const styles = getStyles(colors);
  const { items, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart, deliverySchedule, setDeliverySchedule } = useCart();
  const [showDeliveryScheduler, setShowDeliveryScheduler] = useState(false);
  const insets = useSafeAreaInsets();
  const { horizontalPadding, scaleFont } = useResponsive();
  const shippingFee = deliverySchedule ? 15 : 0;

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, quantity);
    }
  };

  const handleQuantityTextChange = (productId: string, text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0) {
      updateQuantity(productId, num);
    }
  };

  const handleRemoveItem = (productId: string, productName: string) => {
    Alert.alert(
      'Eliminar producto',
      `¿Estás seguro de que quieres eliminar ${productName} del carrito?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeFromCart(productId) }
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Vaciar carrito',
      '¿Estás seguro de que quieres vaciar todo el carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Vaciar', style: 'destructive', onPress: clearCart }
      ]
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos al carrito para continuar');
      return;
    }
    
    // Si no hay programación de entrega, mostrar el programador primero
    if (!deliverySchedule) {
      setShowDeliveryScheduler(true);
      return;
    }
    
    router.push('/payments');
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <ProductImage 
        source={{ uri: item.product.image || '' }} 
        style={styles.productImage}
        fallbackIcon="bag-outline"
        fallbackColor={colors.primary}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.product.name}</Text>
        <Text style={styles.productPrice}>S/ {(item.unitPrice ?? 0).toFixed(2)}</Text>
        <Text style={styles.productCategory}>{item.product.category}</Text>
        
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(item.product.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={ThemeDimensions.isSmallScreen ? 14 : 16} color={colors.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.quantityInput}
            value={String(item.quantity)}
            onChangeText={(text) => handleQuantityTextChange(item.product.id, text)}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(item.product.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={ThemeDimensions.isSmallScreen ? 14 : 16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.itemActions}>
        <Text style={styles.itemTotal}>
          S/ {(item.unitPrice * item.quantity).toFixed(2)}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.product.id, item.product.name)}
        >
          <Ionicons name="trash-outline" size={ThemeDimensions.isSmallScreen ? 18 : 20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={ThemeDimensions.isSmallScreen ? 64 : 80} color={colors.textLight} />
      <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
      <Text style={styles.emptySubtitle}>
        Explora el catálogo y agrega productos para comenzar tus compras.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top, paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.title}>Carrito de Compras</Text>
        {items.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearCart}>
            <Ionicons name="trash-outline" size={ThemeDimensions.isSmallScreen ? 18 : 20} color={colors.error} />
            <Text style={styles.clearButtonText}>Vaciar</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.product.id}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.footer}>
            {deliverySchedule ? (
              <View style={styles.deliveryInfo}>
                <View style={styles.deliveryHeader}>
                  <Ionicons name="calendar" size={ThemeDimensions.isSmallScreen ? 14 : 16} color={colors.primary} />
                  <Text style={styles.deliveryTitle}>Entrega Programada</Text>
                  <TouchableOpacity onPress={() => setShowDeliveryScheduler(true)}>
                    <Ionicons name="create-outline" size={ThemeDimensions.isSmallScreen ? 14 : 16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.deliveryDate}>
                  {formatDateForDisplay(deliverySchedule.date)}
                </Text>
                <Text style={styles.deliveryTime}>
                  Horario: {deliverySchedule.timeSlot}
                </Text>
                <Text style={styles.deliveryAddress} numberOfLines={2}>
                  Dirección: {deliverySchedule.address}
                </Text>
              </View>
            ) : (
              <AppButton
                label="Programar Entrega"
                onPress={() => setShowDeliveryScheduler(true)}
                style={{ marginBottom: Spacing.md }}
              />
            )}

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>S/ {totalPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Envío</Text>
                <Text style={styles.summaryValue}>
                  {shippingFee === 0 ? 'Gratis' : `S/ ${shippingFee.toFixed(2)}`}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  S/ {(totalPrice + shippingFee).toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>Proceder al Pago</Text>
              <Ionicons name="arrow-forward" size={ThemeDimensions.isSmallScreen ? 18 : 20} color={colors.background} />
            </TouchableOpacity>
          </View>
        </>
      )}

      <DeliveryScheduler
        visible={showDeliveryScheduler}
        onClose={() => setShowDeliveryScheduler(false)}
        onSchedule={(schedule) => {
          setDeliverySchedule(schedule);
          setShowDeliveryScheduler(false);
          // Después de programar, preguntar si quiere continuar al pago
          Alert.alert(
            'Entrega Programada',
            '¡Perfecto! ¿Deseas continuar al pago ahora?',
            [
              { text: 'Más tarde', style: 'cancel' },
              { text: 'Continuar al Pago', onPress: () => router.push('/payments') }
            ]
          );
        }}
        existingSchedule={deliverySchedule}
      />
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Shadows.sm,
  },
  title: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.xl : FontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  clearButtonText: {
    color: colors.error,
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  cartList: {
    padding: Spacing.lg,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  productImage: {
    width: ThemeDimensions.isSmallScreen ? 70 : 80,
    height: ThemeDimensions.isSmallScreen ? 70 : 80,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  itemInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  productName: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  productPrice: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    color: colors.success,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  productCategory: {
    fontSize: FontSizes.xs,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  quantityButton: {
    width: ThemeDimensions.isSmallScreen ? 28 : 32,
    height: ThemeDimensions.isSmallScreen ? 28 : 32,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityText: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: Spacing.md,
    minWidth: 20,
    textAlign: 'center',
  },
  quantityInput: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: Spacing.xs,
    minWidth: ThemeDimensions.isSmallScreen ? 40 : 50,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 80,
  },
  itemTotal: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: Spacing.sm,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  footer: {
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Shadows.md,
  },
  deliveryInfo: {
    backgroundColor: colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deliveryTitle: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  deliveryDate: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  deliveryTime: {
    fontSize: FontSizes.sm,
    color: colors.primary,
    marginBottom: Spacing.xs,
  },
  deliveryAddress: {
    fontSize: FontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  summary: {
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    color: colors.text,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.md : FontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.md : FontSizes.lg,
    fontWeight: 'bold',
    color: colors.success,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: ThemeDimensions.isSmallScreen ? 48 : 50,
  },
  checkoutButtonText: {
    color: colors.background,
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.md : FontSizes.lg,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.xl : FontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
