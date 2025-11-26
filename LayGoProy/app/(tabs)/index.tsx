import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import DeliveryScheduler from '../../components/DeliveryScheduler';
import { ResponsiveCard, ResponsiveLayout } from '../../components/ResponsiveLayout';
import { BorderRadius, Colors, Dimensions, FontSizes, Shadows, Spacing } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useMetrics } from '../../contexts/MetricsContext';
import { useOrders } from '../../contexts/OrdersContext';

export default function HomeScreen() {
  return <HomeContent />;
}

function HomeContent() {
  const { user } = useAuth();
  const { 
    totalItems, 
    totalPrice, 
    wholesaleTotal, 
    regularTotal, 
    isWholesaleMode, 
    toggleWholesaleMode,
    getCartSummary,
  } = useCart();
  const { getUserMetrics, reloadMetrics } = useMetrics();
  const { getOrdersByUser } = useOrders();

  const [showDeliveryScheduler, setShowDeliveryScheduler] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const cartSummary = getCartSummary();

  // Recargar métricas cuando el usuario cambia o cuando se monta el componente
  useEffect(() => {
    if (user?.id) {
      reloadMetrics(user.id);
    }
  }, [user?.id]);

  // Obtener el último pedido del usuario
  useEffect(() => {
    if (user) {
      const userOrders = getOrdersByUser(user.id);
      if (userOrders.length > 0) {
        // Ordenar por fecha descendente y tomar el más reciente que tenga información de entrega
        const sortedOrders = userOrders
          .filter(order => order.deliveryAddress) // Solo pedidos con dirección
          .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          });
        setLastOrder(sortedOrders.length > 0 ? sortedOrders[0] : null);
      } else {
        setLastOrder(null);
      }
    } else {
      setLastOrder(null);
    }
  }, [user, getOrdersByUser]);

  // Obtener métricas del usuario
  const merchantStats = user ? getUserMetrics(user.id) : {
    totalOrders: 0,
    totalSpent: 0,
    totalSavings: 0,
    averageOrderValue: 0,
    monthlyGoal: 5000,
    monthlyProgress: 0,
  };

  const handleWholesaleToggle = () => {
    Alert.alert(
      'Cambiar Modo de Compra',
      isWholesaleMode 
        ? '¿Cambiar a modo minorista? Perderás los precios mayoristas.'
        : '¿Cambiar a modo mayorista? Obtendrás precios especiales para comerciantes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: toggleWholesaleMode }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header con branding Frito-Lay */}
      <ResponsiveCard style={styles.header} padding="lg">
        <ResponsiveLayout direction="row" justify="space-between" align="center">
          <View style={styles.brandContainer}>
            <Text style={styles.brandText}>Frito-Lay</Text>
            <Text style={styles.brandSubtext}>Comerciantes</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>¡Hola, {user?.name}!</Text>
            <Text style={styles.subtitleText}>Tu plataforma de reabastecimiento</Text>
          </View>
        </ResponsiveLayout>
      </ResponsiveCard>

      {/* Modo de compra */}
      <ResponsiveCard style={styles.modeContainer}>
        <ResponsiveLayout direction="row" justify="space-between" align="center" gap="md">
          <Text style={styles.modeTitle}>Modo de Compra</Text>
          <Switch
            value={isWholesaleMode}
            onValueChange={handleWholesaleToggle}
            trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            thumbColor={isWholesaleMode ? Colors.light.accent : Colors.light.textLight}
          />
        </ResponsiveLayout>
        <Text style={styles.modeDescription}>
          {isWholesaleMode 
            ? 'Precios mayoristas activos - Ideal para reabastecimiento de tienda'
            : 'Precios minoristas - Para compras personales'
          }
        </Text>
      </ResponsiveCard>      

      {/* Dashboard de Negocio */}
      <ResponsiveCard style={styles.dashboardCard} padding="lg">
        <Text style={styles.sectionTitle}>Dashboard de Negocio</Text>
        <ResponsiveLayout direction="row" justify="space-around" align="center" gap="sm">
          <View style={styles.dashboardStat}>
            <Ionicons name="receipt" size={Dimensions.isSmallScreen ? 20 : 24} color={Colors.light.primary} />
            <Text style={styles.dashboardNumber}>{merchantStats.totalOrders}</Text>
            <Text style={styles.dashboardLabel}>Pedidos</Text>
          </View>
          <View style={styles.dashboardStat}>
            <Ionicons name="cash" size={Dimensions.isSmallScreen ? 20 : 24} color={Colors.light.success} />
            <Text style={styles.dashboardNumber}>S/ {merchantStats.totalSpent.toFixed(0)}</Text>
            <Text style={styles.dashboardLabel}>Gastado</Text>
          </View>
          <View style={styles.dashboardStat}>
            <Ionicons name="trending-down" size={Dimensions.isSmallScreen ? 20 : 24} color={Colors.light.warning} />
            <Text style={styles.dashboardNumber}>S/ {merchantStats.totalSavings.toFixed(0)}</Text>
            <Text style={styles.dashboardLabel}>Ahorrado</Text>
          </View>
        </ResponsiveLayout>
        {/* Progreso mensual */}
        <View style={styles.monthlyProgress}>
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
                { width: `${Math.min((merchantStats.monthlyProgress / merchantStats.monthlyGoal) * 100, 100)}%` }
              ]} 
            />
          </View>
        </View>
      </ResponsiveCard>

      {/* Último Pedido - Información de Entrega */}
      {isWholesaleMode && lastOrder && lastOrder.deliveryAddress && (
        <View style={styles.deliveryContainer}>
          <View style={styles.deliveryHeader}>
            <Ionicons name="calendar" size={20} color={Colors.light.primary} />
            <Text style={styles.deliveryTitle}>Último Pedido - Entrega Programada</Text>
          </View>
          <View style={styles.deliveryInfo}>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderLabel}>Pedido:</Text>
              <Text style={styles.orderValue}>{lastOrder.id}</Text>
            </View>
            {lastOrder.deliveryDate && (
              <Text style={styles.deliveryDate}>Fecha: {lastOrder.deliveryDate}</Text>
            )}
            {lastOrder.deliveryTimeSlot && (
              <Text style={styles.deliveryTime}>Horario: {lastOrder.deliveryTimeSlot}</Text>
            )}
            <Text style={styles.deliveryAddress}>Dirección: {lastOrder.deliveryAddress}</Text>
            {lastOrder.paymentMethod && (
              <Text style={styles.paymentMethod}>Método de pago: {lastOrder.paymentMethod}</Text>
            )}
            <View style={styles.orderStatusContainer}>
              <Text style={styles.orderStatusLabel}>Estado:</Text>
              <Text style={[
                styles.orderStatusValue,
                lastOrder.status === 'delivered' && styles.orderStatusDelivered,
                lastOrder.status === 'pending' && styles.orderStatusPending,
                lastOrder.status === 'confirmed' && styles.orderStatusConfirmed,
              ]}>
                {lastOrder.status === 'pending' ? 'Pendiente' :
                 lastOrder.status === 'confirmed' ? 'Confirmado' :
                 lastOrder.status === 'preparing' ? 'Preparando' :
                 lastOrder.status === 'shipped' ? 'En camino' :
                 lastOrder.status === 'delivered' ? 'Entregado' :
                 lastOrder.status === 'cancelled' ? 'Cancelado' : lastOrder.status}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Acciones rápidas */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="grid" size={24} color={Colors.light.primary} />
          <View style={styles.actionContent}>
            <Text style={styles.actionText}>Catálogo de Productos</Text>
            <Text style={styles.actionSubtext}>Ver todos los productos disponibles</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="receipt" size={24} color={Colors.light.warning} />
          <View style={styles.actionContent}>
            <Text style={styles.actionText}>Mis Pedidos</Text>
            <Text style={styles.actionSubtext}>Historial y seguimiento</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="analytics" size={24} color={Colors.light.secondary} />
          <View style={styles.actionContent}>
            <Text style={styles.actionText}>Dashboard de Ventas</Text>
            <Text style={styles.actionSubtext}>Métricas y reportes</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="person" size={24} color={Colors.light.info} />
          <View style={styles.actionContent}>
            <Text style={styles.actionText}>Mi Perfil</Text>
            <Text style={styles.actionSubtext}>Configuración de cuenta</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.textLight} />
        </TouchableOpacity>
      </View>

      {/* Beneficios para comerciantes */}
      <View style={styles.benefitsContainer}>
        <Text style={styles.sectionTitle}>Beneficios Exclusivos</Text>
        
        <View style={styles.benefitItem}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.light.success} />
          <Text style={styles.benefitText}>Precios mayoristas preferenciales</Text>
        </View>
        
        <View style={styles.benefitItem}>
          <Ionicons name="flash" size={20} color={Colors.light.warning} />
          <Text style={styles.benefitText}>Entrega programada y confiable</Text>
        </View>
        
        <View style={styles.benefitItem}>
          <Ionicons name="refresh" size={20} color={Colors.light.primary} />
          <Text style={styles.benefitText}>Reabastecimiento automático</Text>
        </View>

        <View style={styles.benefitItem}>
          <Ionicons name="headset" size={20} color={Colors.light.info} />
          <Text style={styles.benefitText}>Soporte especializado 24/7</Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.light.primary,
    marginBottom: Spacing.lg,
  },
  brandContainer: {
    alignItems: 'flex-start',
    flex: 1,
  },
  brandText: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.xxl : FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.light.background,
    letterSpacing: 1,
  },
  brandSubtext: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.xs : FontSizes.sm,
    color: Colors.light.accent,
    fontWeight: '600',
    marginTop: -Spacing.xs,
  },
  userInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  welcomeText: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.md : FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.light.background,
    marginBottom: Spacing.xs,
  },
  subtitleText: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.xs : FontSizes.sm,
    color: Colors.light.accent,
    textAlign: 'right',
  },
  modeContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modeTitle: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.md : FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  modeDescription: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.xs : FontSizes.sm,
    color: Colors.light.textSecondary,
    lineHeight: Dimensions.isSmallScreen ? 16 : 20,
    marginTop: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    minHeight: Dimensions.isSmallScreen ? 80 : 100,
  },
  statNumber: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.lg : FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginVertical: Spacing.xs,
  },
  statLabel: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.xs : FontSizes.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  deliveryContainer: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  deliveryTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: Spacing.sm,
  },
  deliveryInfo: {
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  deliveryDate: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  deliveryTime: {
    fontSize: FontSizes.sm,
    color: Colors.light.primary,
    marginBottom: Spacing.xs,
  },
  deliveryAddress: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  orderLabel: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  orderValue: {
    fontSize: FontSizes.md,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  paymentMethod: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  orderStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  orderStatusLabel: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    marginRight: Spacing.sm,
  },
  orderStatusValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderStatusDelivered: {
    color: Colors.light.success,
  },
  orderStatusPending: {
    color: Colors.light.warning,
  },
  orderStatusConfirmed: {
    color: Colors.light.primary,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
  },
  scheduleButtonText: {
    fontSize: FontSizes.md,
    color: Colors.light.primary,
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  quickActions: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  actionContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  actionText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  actionSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
  },
  benefitsContainer: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  benefitText: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    marginLeft: Spacing.md,
    flex: 1,
  },
  dashboardCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dashboardStat: {
    alignItems: 'center',
    flex: 1,
  },
  dashboardNumber: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.lg : FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginVertical: Spacing.xs,
  },
  dashboardLabel: {
    fontSize: Dimensions.isSmallScreen ? FontSizes.xs : FontSizes.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  monthlyProgress: {
    marginTop: Spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
  },
  progressValue: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.sm,
  },
});