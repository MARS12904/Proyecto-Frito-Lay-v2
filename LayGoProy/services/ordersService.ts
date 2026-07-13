import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { Order } from '../contexts/OrdersContext';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (value: string): boolean => UUID_REGEX.test(value);

const mapOrderItem = (item: any) => ({
  id: item.product_id || item.id || '',
  name: item.products?.name || item.product_name || 'Producto',
  brand: item.products?.brand || item.product_brand || '',
  quantity: item.quantity || 0,
  unitPrice: Number(item.unit_price ?? item.price ?? 0),
  subtotal: Number(item.subtotal ?? 0),
  weight: item.products?.weight || item.weight || '',
});

const mapOrder = (order: any): Order => ({
  id: order.id,
  date: order.created_at
    ? new Date(order.created_at).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0],
  status: order.status || 'pending',
  total: Number(order.total ?? 0),
  wholesaleTotal: Number(order.wholesale_total ?? order.total ?? 0),
  savings: Number(order.savings ?? 0),
  items: (order.order_items || []).map(mapOrderItem),
  deliveryDate: order.delivery_date,
  deliveryFee: Number(order.delivery_fee ?? 0),
  deliveryZone: order.delivery_zone || undefined,
  deliveryAddress: order.delivery_addresses?.address || '',
  deliveryAddressId: order.delivery_address_id || undefined,
  deliveryTimeSlot: order.delivery_time_slot,
  paymentMethod: order.payment_method || 'Desconocido',
  isWholesale: order.is_wholesale ?? true,
  notes: order.notes,
  userId: order.user_id,
});

const orderSelectQuery = `
  *,
  delivery_addresses ( address ),
  order_items (
    id,
    product_id,
    product_name,
    product_brand,
    quantity,
    unit_price,
    subtotal,
    weight,
    products ( id, name, brand, weight )
  )
`;

export const ordersService = {
  async getOrdersByUser(userId: string): Promise<Order[]> {
    if (!isValidUUID(userId) || !isSupabaseAvailable() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(orderSelectQuery)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }

      return (data || []).map(mapOrder);
    } catch (error) {
      console.error('Error in getOrdersByUser:', error);
      return [];
    }
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    if (!isValidUUID(orderId) || !isSupabaseAvailable() || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(orderSelectQuery)
        .eq('id', orderId)
        .single();

      if (error || !data) {
        console.error('Error fetching order:', error);
        return null;
      }

      return mapOrder(data);
    } catch (error) {
      console.error('Error in getOrderById:', error);
      return null;
    }
  },

  async createOrder(orderData: Omit<Order, 'id' | 'date' | 'status'>): Promise<string | null> {
    if (!isValidUUID(orderData.userId) || !isSupabaseAvailable() || !supabase) {
      return null;
    }

    try {
        // Use the total passed by the caller (includes delivery fee, processing, etc.)
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: orderData.userId,
            total: orderData.total,
            wholesale_total: orderData.wholesaleTotal || orderData.total,
            savings: orderData.savings || 0,
            status: 'pending',
            payment_status: 'pending',
            delivery_address_id: orderData.deliveryAddressId || null,
            delivery_date: orderData.deliveryDate,
            delivery_time_slot: orderData.deliveryTimeSlot,
            payment_method: orderData.paymentMethod,
            notes: orderData.notes || null,
            is_wholesale: orderData.isWholesale,
            delivery_fee: orderData.deliveryFee ?? 0,
            delivery_zone: orderData.deliveryZone || null,
          })
          .select('id')
          .single();

      if (orderError || !order) {
        console.error('Error creating order:', orderError);
        return null;
      }

      const orderItems = orderData.items.map((item) => ({
        order_id: order.id,
        product_id: isValidUUID(item.id) ? item.id : null,
        product_name: item.name,
        product_brand: item.brand,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
        weight: item.weight,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        await supabase.from('orders').delete().eq('id', order.id);
        return null;
      }

      return order.id;
    } catch (error) {
      console.error('Error in createOrder:', error);
      return null;
    }
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    if (!isValidUUID(orderId) || !isSupabaseAvailable() || !supabase) {
      return false;
    }

    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      return false;
    }
  },
};
