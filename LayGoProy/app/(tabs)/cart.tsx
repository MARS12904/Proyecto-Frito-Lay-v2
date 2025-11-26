import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { useCart } from '../../contexts/CartContext';
import DeliveryScheduler from '../../components/DeliveryScheduler';
import ProductImage from '../../components/ProductImage';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows, Dimensions as ThemeDimensions } from '../../constants/theme';

export default function CartScreen() {
  return <CartContent />;
}

function CartContent() {
  const { items, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart, deliverySchedule, setDeliverySchedule } = useCart();
  const { user } = useAuth();
  const [showDeliveryScheduler, setShowDeliveryScheduler] = useState(false);

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, quantity);
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
    
    // Ir directamente al pago si ya hay programación de entrega
    router.push('/payments');
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      <ProductImage 
        source={{ uri: item.product.image }} 
        style={styles.productImage}
        fallbackIcon="bag-outline"
        fallbackColor={Colors.light.primary}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.productName}>{item.product.name}</Text>
        <Text style={styles.productPrice}>S/ {item.product.price.toFixed(2)}</Text>
        <Text style={styles.productCategory}>{item.product.category}</Text>
        
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(item.product.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={ThemeDimensions.isSmallScreen ? 14 : 16} color={Colors.light.primary} />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(item.product.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={ThemeDimensions.isSmallScreen ? 14 : 16} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.itemActions}>
        <Text style={styles.itemTotal}>
          S/ {(item.product.price * item.quantity).toFixed(2)}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.product.id, item.product.name)}
        >
          <Ionicons name="trash-outline" size={ThemeDimensions.isSmallScreen ? 18 : 20} color={Colors.light.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={ThemeDimensions.isSmallScreen ? 64 : 80} color={Colors.light.textLight} />
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptySubtitle}>
          Agrega algunos productos para comenzar
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Carrito de Compras</Text>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearCart}>
          <Ionicons name="trash-outline" size={ThemeDimensions.isSmallScreen ? 18 : 20} color={Colors.light.error} />
          <Text style={styles.clearButtonText}>Vaciar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={styles.cartList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        {/* Información de entrega programada */}
        {deliverySchedule && (
          <View style={styles.deliveryInfo}>
            <View style={styles.deliveryHeader}>
              <Ionicons name="calendar" size={ThemeDimensions.isSmallScreen ? 14 : 16} color={Colors.light.primary} />
              <Text style={styles.deliveryTitle}>Entrega Programada</Text>
              <TouchableOpacity onPress={() => setShowDeliveryScheduler(true)}>
                <Ionicons name="create-outline" size={ThemeDimensions.isSmallScreen ? 14 : 16} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.deliveryDate}>{deliverySchedule.date}</Text>
            <Text style={styles.deliveryTime}>{deliverySchedule.timeSlot}</Text>
            <Text style={styles.deliveryAddress}>{deliverySchedule.address}</Text>
          </View>
        )}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total de productos:</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>S/ {totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Envío:</Text>
            <Text style={styles.summaryValue}>{deliverySchedule ? 'S/ 15.00' : 'Gratis'}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>S/ {(totalPrice + (deliverySchedule ? 15.00 : 0)).toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
          <Text style={styles.checkoutButtonText}>Proceder al Pago</Text>
          <Ionicons name="arrow-forward" size={ThemeDimensions.isSmallScreen ? 18 : 20} color={Colors.light.background} />
        </TouchableOpacity>
      </View>

      {/* Modal del programador de entrega */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: ThemeDimensions.isSmallScreen ? Spacing.xxl : 60,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    ...Shadows.sm,
  },
  title: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.xl : FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.light.text,
    flex: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  clearButtonText: {
    color: Colors.light.error,
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  cartList: {
    padding: Spacing.lg,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundCard,
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
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  productPrice: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    color: Colors.light.success,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  productCategory: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
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
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quantityText: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginHorizontal: Spacing.md,
    minWidth: 20,
    textAlign: 'center',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 80,
  },
  itemTotal: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  footer: {
    backgroundColor: Colors.light.backgroundCard,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    ...Shadows.md,
  },
  deliveryInfo: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deliveryTitle: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  deliveryDate: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  deliveryTime: {
    fontSize: FontSizes.sm,
    color: Colors.light.primary,
    marginBottom: Spacing.xs,
  },
  deliveryAddress: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
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
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.md : FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.md : FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.light.success,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: ThemeDimensions.isSmallScreen ? 48 : 50,
  },
  checkoutButtonText: {
    color: Colors.light.background,
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.md : FontSizes.lg,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.xl : FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: ThemeDimensions.isSmallScreen ? FontSizes.sm : FontSizes.md,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
