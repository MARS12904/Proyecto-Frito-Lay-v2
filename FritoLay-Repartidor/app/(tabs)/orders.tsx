import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { DeliveryService, DeliveryAssignment } from '../../services/deliveryService';
import { useResponsive } from '../../hooks/useResponsive';
import { Colors, BorderRadius, Shadows, DeliveryStatusColors, DeliveryStatusText } from '../../constants/theme';

export default function OrdersScreen() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'in_transit' | 'delivered'>('all');
  const { fs, sp, wp, isTablet, isSmallPhone, isLandscape, width } = useResponsive();

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

  const filteredAssignments = filter === 'all'
    ? assignments
    : assignments.filter(a => a.status === filter);

  // Estilos dinámicos responsive
  const dynamicStyles = {
    filterContainer: {
      paddingVertical: sp(isTablet ? 16 : 12),
      paddingHorizontal: sp(isTablet ? 20 : 16),
    },
    filterButton: {
      paddingHorizontal: sp(isTablet ? 20 : 16),
      paddingVertical: sp(isTablet ? 10 : 8),
      marginRight: sp(isTablet ? 12 : 8),
    },
    filterText: {
      fontSize: fs(isTablet ? 16 : 14),
    },
    listContent: {
      padding: sp(isTablet ? 20 : 16),
      maxWidth: isTablet ? 800 : undefined,
      alignSelf: isTablet ? 'center' as const : undefined,
      width: isTablet ? '100%' : undefined,
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
    // Calcular número de columnas para tablets en landscape
    numColumns: isTablet && isLandscape ? 2 : 1,
    columnWrapper: isTablet && isLandscape ? {
      gap: sp(16),
    } : undefined,
    cardFlex: isTablet && isLandscape ? {
      flex: 1,
      maxWidth: (width - sp(56)) / 2,
    } : undefined,
  };

  const renderOrderItem = ({ item, index }: { item: DeliveryAssignment; index: number }) => (
    <TouchableOpacity
      style={[
        styles.orderCard, 
        dynamicStyles.orderCard,
        dynamicStyles.cardFlex,
      ]}
      onPress={() => router.push(`/orders/${item.id}`)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderNumber, dynamicStyles.orderNumber]}>
            Pedido #{item.order?.order_number || 'N/A'}
          </Text>
          <Text style={[styles.orderDate, dynamicStyles.orderDate]}>
            {new Date(item.assigned_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            dynamicStyles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              dynamicStyles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      {item.order?.delivery_address && (
        <View style={styles.orderAddress}>
          <Ionicons name="location-outline" size={dynamicStyles.locationIconSize} color={Colors.textSecondary} />
          <Text style={[styles.addressText, dynamicStyles.addressText]} numberOfLines={2}>
            {item.order.delivery_address}
          </Text>
        </View>
      )}

      {item.order?.total && (
        <View style={styles.orderFooter}>
          <Text style={[styles.orderTotal, dynamicStyles.orderTotal]}>
            Total: S/. {item.order.total.toFixed(2)}
          </Text>
          <Ionicons name="chevron-forward" size={dynamicStyles.chevronSize} color={Colors.textLight} />
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
        <View style={styles.filterRow}>
          {(['all', 'assigned', 'in_transit', 'delivered'] as const).map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterButton,
                dynamicStyles.filterButton,
                filter === filterOption && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(filterOption)}
            >
              <Text
                style={[
                  styles.filterText,
                  dynamicStyles.filterText,
                  filter === filterOption && styles.filterTextActive,
                ]}
              >
                {filterOption === 'all' ? 'Todos' : getStatusText(filterOption)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredAssignments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={dynamicStyles.emptyIconSize} color={Colors.textLight} />
          <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
            {filter === 'all'
              ? 'No tienes pedidos asignados'
              : `No hay pedidos ${getStatusText(filter).toLowerCase()}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAssignments}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          key={dynamicStyles.numColumns}
          numColumns={dynamicStyles.numColumns}
          columnWrapperStyle={dynamicStyles.numColumns > 1 ? dynamicStyles.columnWrapper : undefined}
          contentContainerStyle={dynamicStyles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundSecondary,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.white,
  },
  listContent: {},
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
  orderInfo: {
    flex: 1,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressText: {
    color: Colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  orderTotal: {
    fontWeight: '600',
    color: Colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
