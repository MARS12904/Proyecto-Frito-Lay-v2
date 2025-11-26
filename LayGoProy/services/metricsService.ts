import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { UserMetrics } from '../contexts/MetricsContext';

// Función para validar si un string es un UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const metricsService = {
  // Calcular métricas del usuario desde los pedidos en Supabase
  async getUserMetrics(userId: string): Promise<UserMetrics> {
    // Validar que el userId sea un UUID válido (Supabase requiere UUIDs)
    if (!isValidUUID(userId)) {
      console.warn('userId no es un UUID válido, retornando métricas por defecto (modo local)');
      return this.getDefaultMetrics(userId);
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, retornando métricas por defecto');
      return this.getDefaultMetrics(userId);
    }
    
    try {
      if (!supabase) return this.getDefaultMetrics(userId);
      
      // Obtener todos los pedidos completados del usuario (excluir cancelados)
      // Usar delivery_orders directamente para evitar problemas con la vista orders
      let orders = null;
      let error = null;
      
      // Intentar primero con delivery_orders
      const deliveryOrdersResult = await (supabase as any)
        .from('delivery_orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            unit_price,
            products (
              name,
              brand
            )
          )
        `)
        .eq('created_by', userId)
        .in('status', ['completed', 'delivered'])
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      
      if (deliveryOrdersResult.error || !deliveryOrdersResult.data) {
        // Fallback a orders (vista) sin relaciones
        const ordersResult = await (supabase as any)
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['completed', 'delivered'])
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false });
        
        orders = ordersResult.data;
        error = ordersResult.error;
        
        // Si hay pedidos pero sin items, obtener items por separado con datos del producto
        if (orders && orders.length > 0) {
          const orderIds = orders.map((o: any) => o.id);
          const { data: itemsData } = await (supabase as any)
            .from('order_items')
            .select(`
              *,
              products (
                id,
                name,
                brand
              )
            `)
            .in('order_id', orderIds);
          
          // Asignar items a cada pedido
          orders = orders.map((order: any) => ({
            ...order,
            order_items: itemsData?.filter((item: any) => item.order_id === order.id) || []
          }));
        }
      } else {
        orders = deliveryOrdersResult.data;
        error = deliveryOrdersResult.error;
      }

      if (error) {
        console.error('Error fetching orders for metrics:', error);
        return this.getDefaultMetrics(userId);
      }

      if (!orders || orders.length === 0) {
        return this.getDefaultMetrics(userId);
      }

      // Calcular métricas
      const totalOrders = orders.length;
      // Usar 'total' si viene de delivery_orders, 'total_amount' si viene de orders
      const totalSpent = orders.reduce((sum, order) => sum + (order.total || order.total_amount || 0), 0);
      const totalSavings = orders.reduce((sum, order) => sum + (order.savings || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Calcular productos top
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      orders.forEach((order: any) => {
        (order.order_items || []).forEach((item: any) => {
          const productName = item.products?.name || item.product_name || 'Producto';
          const itemPrice = item.unit_price || item.price || 0;
          const itemQuantity = item.quantity || 0;
          const itemRevenue = item.subtotal || (itemQuantity * itemPrice);
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

      // Calcular actividad reciente
      const recentActivity = orders.slice(0, 10).map((order: any) => ({
        type: 'order' as const,
        description: `Pedido completado`,
        date: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        amount: order.total || order.total_amount || 0,
      }));

      // Calcular progreso mensual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startOfMonth;
      });
      const monthlyProgress = monthlyOrders.reduce((sum, order) => sum + (order.total || order.total_amount || 0), 0);

      // Determinar marca favorita
      const brandMap = new Map<string, number>();
      orders.forEach((order: any) => {
        (order.order_items || []).forEach((item: any) => {
          const brand = item.products?.brand || item.product_brand || '';
          if (brand) {
            const count = brandMap.get(brand) || 0;
            brandMap.set(brand, count + (item.quantity || 0));
          }
        });
      });
      const favoriteBrand = Array.from(brandMap.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      return {
        userId,
        totalOrders,
        totalSpent,
        totalSavings,
        averageOrderValue,
        lastOrderDate: orders[0]?.created_at ? new Date(orders[0].created_at).toISOString().split('T')[0] : undefined,
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

