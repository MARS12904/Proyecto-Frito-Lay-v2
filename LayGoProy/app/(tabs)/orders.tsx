import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';

// Función para parsear fecha YYYY-MM-DD sin problemas de zona horaria
const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  // Si ya es un formato con hora, usar Date directamente
  if (dateStr.includes('T') || dateStr.includes(' ')) {
    return new Date(dateStr);
  }
  // Para formato YYYY-MM-DD, parsear manualmente para evitar problemas de UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Función para formatear fecha para mostrar
const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('es-PE', options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

interface OrderItem {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  weight: string;
}

interface Order {
  id: string;
  date: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  wholesaleTotal: number;
  savings: number;
  items: OrderItem[];
  trackingNumber?: string;
  deliveryDate?: string;
  deliveryAddress?: string;
  paymentMethod: string;
  isWholesale: boolean;
  notes?: string;
}

const mockOrders: Order[] = [
  {
    id: 'FL-2024-001',
    date: '2024-01-15',
    status: 'delivered',
    total: 156.80,
    wholesaleTotal: 125.60,
    savings: 31.20,
    items: [
      { id: 'lays-classic-150g', name: 'Lay\'s Clásicas', brand: 'Lay\'s', quantity: 20, unitPrice: 2.80, subtotal: 56.00, weight: '150g' },
      { id: 'doritos-nacho-150g', name: 'Doritos Nacho Cheese', brand: 'Doritos', quantity: 15, unitPrice: 3.30, subtotal: 49.50, weight: '150g' },
      { id: 'cheetos-queso-150g', name: 'Cheetos Queso', brand: 'Cheetos', quantity: 12, unitPrice: 3.20, subtotal: 38.40, weight: '150g' },
    ],
    trackingNumber: 'TRK123456789',
    deliveryDate: '2024-01-16',
    deliveryAddress: 'Av. Arequipa 123, Miraflores, Lima',
    paymentMethod: 'Transferencia Bancaria',
    isWholesale: true,
  },
  {
    id: 'FL-2024-002',
    date: '2024-01-20',
    status: 'shipped',
    total: 89.40,
    wholesaleTotal: 71.20,
    savings: 18.20,
    items: [
      { id: 'ruffles-queso-150g', name: 'Ruffles Queso', brand: 'Ruffles', quantity: 18, unitPrice: 3.60, subtotal: 64.80, weight: '150g' },
      { id: 'lays-queso-150g', name: 'Lay\'s Queso', brand: 'Lay\'s', quantity: 8, unitPrice: 3.00, subtotal: 24.00, weight: '150g' },
    ],
    trackingNumber: 'TRK987654321',
    deliveryDate: '2024-01-22',
    deliveryAddress: 'Jr. Ucayali 456, Lima Centro',
    paymentMethod: 'Crédito Comercial',
    isWholesale: true,
  },
  {
    id: 'FL-2024-003',
    date: '2024-01-25',
    status: 'preparing',
    total: 45.60,
    wholesaleTotal: 36.00,
    savings: 9.60,
    items: [
      { id: 'lays-barbacoa-150g', name: 'Lay\'s Barbacoa', brand: 'Lay\'s', quantity: 12, unitPrice: 3.00, subtotal: 36.00, weight: '150g' },
    ],
    deliveryDate: '2024-01-27',
    deliveryAddress: 'Av. Javier Prado 789, San Isidro',
    paymentMethod: 'Efectivo contra Entrega',
    isWholesale: true,
  },
  {
    id: 'FL-2024-004',
    date: '2024-01-28',
    status: 'pending',
    total: 67.20,
    wholesaleTotal: 53.60,
    savings: 13.60,
    items: [
      { id: 'cheetos-puffs-150g', name: 'Cheetos Puffs', brand: 'Cheetos', quantity: 16, unitPrice: 3.20, subtotal: 51.20, weight: '150g' },
      { id: 'fritos-original-150g', name: 'Fritos Original', brand: 'Fritos', quantity: 8, unitPrice: 3.00, subtotal: 24.00, weight: '150g' },
    ],
    deliveryDate: '2024-01-30',
    deliveryAddress: 'Calle Las Flores 321, La Molina',
    paymentMethod: 'Tarjeta de Crédito',
    isWholesale: true,
  },
];

const statusConfig = {
  pending: { color: Colors.light.warning, label: 'Pendiente', icon: 'time', description: 'Esperando confirmación' },
  confirmed: { color: Colors.light.info, label: 'Confirmado', icon: 'checkmark-circle', description: 'Pedido confirmado' },
  preparing: { color: Colors.light.primary, label: 'Preparando', icon: 'cog', description: 'Preparando pedido' },
  shipped: { color: Colors.light.secondary, label: 'Enviado', icon: 'car', description: 'En camino' },
  delivered: { color: Colors.light.success, label: 'Entregado', icon: 'checkmark-done', description: 'Entregado exitosamente' },
  cancelled: { color: Colors.light.error, label: 'Cancelado', icon: 'close-circle', description: 'Pedido cancelado' },
};

export default function OrdersScreen() {
  return <OrdersContent />;
}

function OrdersContent() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const { user } = useAuth();
  const { getOrdersByUser, updateOrderStatus } = useOrders();
  
  const orders = user ? getOrdersByUser(user.id) : [];

  const filteredOrders = orders.filter(order => {
    if (selectedFilter === 'all') return true;
    return order.status === selectedFilter;
  });

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      'Cancelar pedido',
      '¿Estás seguro de que quieres cancelar este pedido? Esta acción no se puede deshacer.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            await updateOrderStatus(orderId, 'cancelled');
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }
        }
      ]
    );
  };

  const handleReorder = (order: Order) => {
    Alert.alert(
      'Reordenar',
      '¿Deseas agregar todos los productos de este pedido al carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reordenar',
          onPress: () => {
            // Aquí se implementaría la lógica para agregar al carrito
            Alert.alert('Éxito', 'Productos agregados al carrito');
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }
        }
      ]
    );
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const status = statusConfig[item.status];
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>Pedido {item.id}</Text>
            <Text style={styles.orderDate}>
              {formatDate(item.date, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
            {item.isWholesale && (
              <View style={styles.wholesaleBadge}>
                <Ionicons name="business" size={12} color={Colors.light.primary} />
                <Text style={styles.wholesaleText}>Mayorista</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Ionicons name={status.icon as any} size={14} color={Colors.light.background} />
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.orderItems}>
          {item.items.slice(0, 2).map((orderItem, index) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{orderItem.name}</Text>
                <Text style={styles.itemBrand}>{orderItem.brand} • {orderItem.weight}</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                <Text style={styles.itemPrice}>S/ {orderItem.subtotal.toFixed(2)}</Text>
              </View>
            </View>
          ))}
          {item.items.length > 2 && (
            <Text style={styles.moreItemsText}>
              +{item.items.length - 2} productos más
            </Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.totalInfo}>
            <Text style={styles.orderTotal}>S/ {item.total.toFixed(2)}</Text>
            {item.isWholesale && item.savings > 0 && (
              <Text style={styles.savingsText}>Ahorro: S/ {item.savings.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.orderActions}>
            {item.status === 'pending' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelOrder(item.id)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            )}
            {item.status === 'delivered' && (
              <TouchableOpacity
                style={styles.reorderButton}
                onPress={() => handleReorder(item)}
              >
                <Ionicons name="refresh" size={14} color={Colors.light.primary} />
                <Text style={styles.reorderButtonText}>Reordenar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilter = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === item && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(item)}
    >
      <Text style={[
        styles.filterText,
        selectedFilter === item && styles.filterTextActive
      ]}>
        {item === 'all' ? 'Todos' : statusConfig[item as keyof typeof statusConfig].label}
      </Text>
    </TouchableOpacity>
  );

  const filterOptions = ['all', 'pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Pedidos</Text>
        <Text style={styles.subtitle}>Gestiona tus pedidos de reabastecimiento</Text>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          data={filterOptions}
          renderItem={renderFilter}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={Colors.light.textLight} />
          <Text style={styles.emptyTitle}>No hay pedidos</Text>
          <Text style={styles.emptySubtitle}>
            {selectedFilter === 'all' 
              ? 'Aún no has realizado ningún pedido de reabastecimiento'
              : `No hay pedidos con estado "${statusConfig[selectedFilter as keyof typeof statusConfig]?.label}"`
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de detalles del pedido */}
      <Modal
        visible={showOrderDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrderDetails(false)}
      >
        {selectedOrder && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowOrderDetails(false)}
              >
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Detalles del Pedido</Text>
              <View style={styles.modalSpacer} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.orderDetailsCard}>
                <View style={styles.orderDetailsHeader}>
                  <Text style={styles.orderDetailsId}>Pedido {selectedOrder.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig[selectedOrder.status].color }]}>
                    <Ionicons name={statusConfig[selectedOrder.status].icon as any} size={16} color={Colors.light.background} />
                    <Text style={styles.statusText}>{statusConfig[selectedOrder.status].label}</Text>
                  </View>
                </View>
                
                <Text style={styles.orderDetailsDescription}>
                  {statusConfig[selectedOrder.status].description}
                </Text>

                <View style={styles.orderDetailsInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar" size={16} color={Colors.light.primary} />
                    <Text style={styles.infoLabel}>Fecha del pedido:</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(selectedOrder.date, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>

                  {selectedOrder.deliveryDate && (
                    <View style={styles.infoRow}>
                      <Ionicons name="car" size={16} color={Colors.light.primary} />
                      <Text style={styles.infoLabel}>Fecha de entrega:</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(selectedOrder.deliveryDate, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                  )}

                  {selectedOrder.deliveryAddress && (
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={16} color={Colors.light.primary} />
                      <Text style={styles.infoLabel}>Dirección:</Text>
                      <Text style={styles.infoValue}>{selectedOrder.deliveryAddress}</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Ionicons name="card" size={16} color={Colors.light.primary} />
                    <Text style={styles.infoLabel}>Método de pago:</Text>
                    <Text style={styles.infoValue}>{selectedOrder.paymentMethod}</Text>
                  </View>

                  {selectedOrder.trackingNumber && (
                    <View style={styles.infoRow}>
                      <Ionicons name="barcode" size={16} color={Colors.light.primary} />
                      <Text style={styles.infoLabel}>Número de seguimiento:</Text>
                      <Text style={styles.infoValue}>{selectedOrder.trackingNumber}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.productsCard}>
                <Text style={styles.productsTitle}>Productos ({selectedOrder.items.length})</Text>
                {selectedOrder.items.map((item, index) => (
                  <View key={index} style={styles.productItem}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productBrand}>{item.brand} • {item.weight}</Text>
                    </View>
                    <View style={styles.productDetails}>
                      <Text style={styles.productQuantity}>{item.quantity}x</Text>
                      <Text style={styles.productPrice}>S/ {item.subtotal.toFixed(2)}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Resumen</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>S/ {selectedOrder.wholesaleTotal.toFixed(2)}</Text>
                </View>
                {selectedOrder.isWholesale && selectedOrder.savings > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Ahorro mayorista:</Text>
                    <Text style={[styles.summaryValue, styles.savingsValue]}>
                      -S/ {selectedOrder.savings.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>S/ {selectedOrder.total.toFixed(2)}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedOrder.status === 'pending' && (
                <TouchableOpacity
                  style={styles.cancelOrderButton}
                  onPress={() => handleCancelOrder(selectedOrder.id)}
                >
                  <Text style={styles.cancelOrderButtonText}>Cancelar Pedido</Text>
                </TouchableOpacity>
              )}
              {selectedOrder.status === 'delivered' && (
                <TouchableOpacity
                  style={styles.reorderButton}
                  onPress={() => handleReorder(selectedOrder)}
                >
                  <Ionicons name="refresh" size={16} color={Colors.light.primary} />
                  <Text style={styles.reorderButtonText}>Reordenar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
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
  filtersContainer: {
    backgroundColor: Colors.light.backgroundCard,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filtersList: {
    paddingHorizontal: Spacing.lg,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterText: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.light.background,
  },
  ordersList: {
    padding: Spacing.lg,
  },
  orderCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
  },
  orderDate: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  wholesaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  wholesaleText: {
    fontSize: FontSizes.xs,
    color: Colors.light.primary,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    color: Colors.light.background,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  orderItems: {
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
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    fontWeight: '500',
  },
  itemBrand: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  itemPrice: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    fontWeight: '600',
  },
  moreItemsText: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: Spacing.sm,
  },
  totalInfo: {
    flex: 1,
  },
  orderTotal: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  savingsText: {
    fontSize: FontSizes.xs,
    color: Colors.light.success,
    marginTop: 2,
  },
  orderActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.error,
  },
  cancelButtonText: {
    color: Colors.light.error,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    gap: Spacing.xs,
  },
  reorderButtonText: {
    color: Colors.light.primary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  orderDetailsCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  orderDetailsId: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  orderDetailsDescription: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
  },
  orderDetailsInfo: {
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    minWidth: 120,
  },
  infoValue: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    fontWeight: '500',
    flex: 1,
  },
  productsCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  productsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  productBrand: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  productDetails: {
    alignItems: 'flex-end',
  },
  productQuantity: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
  },
  productPrice: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  summaryTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
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
  totalValue: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.light.success,
  },
  modalFooter: {
    padding: Spacing.lg,
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  cancelOrderButton: {
    backgroundColor: Colors.light.error,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelOrderButtonText: {
    color: Colors.light.background,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
