import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { DeliveryService, DeliveryAssignment } from '../../services/deliveryService';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, BorderRadius, Shadows, DeliveryStatusColors, DeliveryStatusText } from '../../constants/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { fs, sp, wp, isTablet, isSmallPhone, isLandscape } = useResponsive();

  useEffect(() => {
    loadAssignments();
  }, [user]);

  const loadAssignments = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await DeliveryService.getMyAssignments(user.id);
      setAssignments(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    return DeliveryStatusColors[status as keyof typeof DeliveryStatusColors] || Colors.textSecondary;
  };

  const getStatusText = (status: string) => {
    return DeliveryStatusText[status] || status;
  };

  const stats = {
    total: assignments.length,
    assigned: assignments.filter(a => a.status === 'assigned').length,
    inTransit: assignments.filter(a => a.status === 'in_transit').length,
    delivered: assignments.filter(a => a.status === 'delivered').length,
  };

  // Estilos dinámicos responsive
  const dynamicStyles = {
    header: {
      padding: sp(isTablet ? 28 : 20),
      paddingTop: sp(isTablet ? 32 : 20),
    },
    greeting: {
      fontSize: fs(isTablet ? 28 : 24),
    },
    subtitle: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    statsContainer: {
      padding: sp(isTablet ? 20 : 16),
      gap: sp(isTablet ? 16 : 12),
      flexDirection: (isLandscape && isTablet ? 'row' : 'row') as 'row',
      flexWrap: 'wrap' as const,
    },
    statCard: {
      flex: isTablet && isLandscape ? undefined : 1,
      minWidth: isTablet ? wp(20) : wp(22),
      padding: sp(isTablet ? 20 : 16),
    },
    statNumber: {
      fontSize: fs(isTablet ? 28 : 24),
    },
    statLabel: {
      fontSize: fs(isTablet ? 14 : 12),
    },
    section: {
      padding: sp(isTablet ? 20 : 16),
    },
    sectionTitle: {
      fontSize: fs(isTablet ? 20 : 18),
      marginBottom: sp(isTablet ? 16 : 12),
    },
    orderCard: {
      padding: sp(isTablet ? 20 : 16),
      marginBottom: sp(isTablet ? 16 : 12),
    },
    orderNumber: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    orderDate: {
      fontSize: fs(isTablet ? 14 : 12),
    },
    statusBadge: {
      paddingHorizontal: sp(isTablet ? 16 : 12),
      paddingVertical: sp(isTablet ? 8 : 6),
    },
    statusText: {
      fontSize: fs(isTablet ? 14 : 12),
    },
    addressText: {
      fontSize: fs(isTablet ? 16 : 14),
    },
    orderTotal: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    emptyIconSize: isTablet ? 80 : 64,
    emptyText: {
      fontSize: fs(isTablet ? 18 : 16),
    },
    locationIconSize: isTablet ? 20 : 16,
    chevronSize: isTablet ? 24 : 20,
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={isTablet ? styles.tabletContent : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.greeting, dynamicStyles.greeting]}>
          Hola, {user?.name}
        </Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
          Gestiona tus entregas
        </Text>
      </View>

      {/* Estadísticas */}
      <View style={[styles.statsContainer, dynamicStyles.statsContainer]}>
        <View style={[styles.statCard, dynamicStyles.statCard]}>
          <Text style={[styles.statNumber, dynamicStyles.statNumber]}>{stats.total}</Text>
          <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Total</Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.statCard]}>
          <Text style={[styles.statNumber, dynamicStyles.statNumber, { color: Colors.warning }]}>
            {stats.assigned}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Asignados</Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.statCard]}>
          <Text style={[styles.statNumber, dynamicStyles.statNumber, { color: Colors.primary }]}>
            {stats.inTransit}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.statLabel]}>En Tránsito</Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.statCard]}>
          <Text style={[styles.statNumber, dynamicStyles.statNumber, { color: Colors.success }]}>
            {stats.delivered}
          </Text>
          <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Entregados</Text>
        </View>
      </View>

      {/* Pedidos Recientes */}
      <View style={[styles.section, dynamicStyles.section]}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Pedidos Recientes</Text>
        {assignments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={dynamicStyles.emptyIconSize} color={Colors.textLight} />
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No tienes pedidos asignados</Text>
          </View>
        ) : (
          assignments.slice(0, 5).map((assignment) => (
            <TouchableOpacity
              key={assignment.id}
              style={[styles.orderCard, dynamicStyles.orderCard]}
              onPress={() => router.push(`/orders/${assignment.id}`)}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={[styles.orderNumber, dynamicStyles.orderNumber]}>
                    Pedido #{assignment.order?.order_number || 'N/A'}
                  </Text>
                  <Text style={[styles.orderDate, dynamicStyles.orderDate]}>
                    {new Date(assignment.assigned_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
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
              </View>
              {assignment.order?.delivery_address && (
                <View style={styles.orderAddress}>
                  <Ionicons name="location-outline" size={dynamicStyles.locationIconSize} color={Colors.textSecondary} />
                  <Text style={[styles.addressText, dynamicStyles.addressText]} numberOfLines={1}>
                    {assignment.order.delivery_address}
                  </Text>
                </View>
              )}
              {assignment.order?.total && (
                <Text style={[styles.orderTotal, dynamicStyles.orderTotal]}>
                  Total: S/. {assignment.order.total.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {assignments.length > 5 && (
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push('/(tabs)/orders')}
        >
          <Text style={styles.viewAllText}>Ver todos los pedidos</Text>
          <Ionicons name="chevron-forward" size={dynamicStyles.chevronSize} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabletContent: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  greeting: {
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  statNumber: {
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    color: Colors.textSecondary,
  },
  section: {},
  sectionTitle: {
    fontWeight: '600',
    color: Colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    marginTop: 16,
    color: Colors.textLight,
  },
  orderCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  orderDate: {
    color: Colors.textSecondary,
  },
  statusBadge: {
    borderRadius: BorderRadius.md,
  },
  statusText: {
    fontWeight: '600',
  },
  orderAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    color: Colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  orderTotal: {
    fontWeight: '600',
    color: Colors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: 4,
  },
});
