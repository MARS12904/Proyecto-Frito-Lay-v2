import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { UserMetrics } from '../contexts/MetricsContext';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (value: string): boolean => UUID_REGEX.test(value);

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'confirmed':
      return 'Confirmado';
    case 'preparing':
      return 'Preparando';
    case 'shipped':
      return 'En camino';
    case 'delivered':
      return 'Entregado';
    default:
      return 'Pedido';
  }
};

export const metricsService = {
  async getUserMetrics(userId: string): Promise<UserMetrics> {
    if (!isValidUUID(userId) || !isSupabaseAvailable() || !supabase) {
      return this.getDefaultMetrics(userId);
    }

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            product_name,
            product_brand,
            subtotal
          )
        `)
        .eq('user_id', userId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error || !orders?.length) {
        if (error) console.error('Error fetching orders for metrics:', error);
        return this.getDefaultMetrics(userId);
      }

      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const totalSavings = orders.reduce((sum, order) => sum + Number(order.savings || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      const productMap = new Map<string, { quantity: number; revenue: number }>();
      orders.forEach((order) => {
        (order.order_items || []).forEach((item: any) => {
          const productName = item.product_name || 'Producto';
          const itemQuantity = Number(item.quantity) || 0;
          const itemRevenue = Number(item.subtotal) || itemQuantity * Number(item.unit_price || 0);
          const existing = productMap.get(productName) || { quantity: 0, revenue: 0 };
          productMap.set(productName, {
            quantity: existing.quantity + itemQuantity,
            revenue: existing.revenue + itemRevenue,
          });
        });
      });

      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

      const recentActivity = orders.slice(0, 10).map((order) => ({
        type: 'order' as const,
        description: `Pedido ${getStatusLabel(order.status || 'pending')}`,
        date: order.created_at
          ? new Date(order.created_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        amount: Number(order.total || 0),
      }));

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyProgress = orders
        .filter((order) => new Date(order.created_at) >= startOfMonth)
        .reduce((sum, order) => sum + Number(order.total || 0), 0);

      const brandMap = new Map<string, number>();
      orders.forEach((order) => {
        (order.order_items || []).forEach((item: any) => {
          const brand = item.product_brand || '';
          if (brand) {
            brandMap.set(brand, (brandMap.get(brand) || 0) + (Number(item.quantity) || 0));
          }
        });
      });

      const favoriteBrand = Array.from(brandMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

      return {
        userId,
        totalOrders,
        totalSpent,
        totalSavings,
        averageOrderValue,
        lastOrderDate: orders[0]?.created_at
          ? new Date(orders[0].created_at).toISOString().split('T')[0]
          : undefined,
        favoriteBrand,
        monthlyGoal: 5000,
        monthlyProgress,
        topProducts,
        recentActivity,
      };
    } catch (error) {
      console.error('Error in getUserMetrics:', error);
      return this.getDefaultMetrics(userId);
    }
  },

  getDefaultMetrics(userId: string): UserMetrics {
    return {
      userId,
      totalOrders: 0,
      totalSpent: 0,
      totalSavings: 0,
      averageOrderValue: 0,
      monthlyGoal: 5000,
      monthlyProgress: 0,
      topProducts: [],
      recentActivity: [],
    };
  },
};
