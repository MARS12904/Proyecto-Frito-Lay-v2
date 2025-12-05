import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { Order, OrderItem } from '../contexts/OrdersContext';

// Función para validar si un string es un UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const ordersService = {
  // Obtener pedidos del usuario
  async getOrdersByUser(userId: string): Promise<Order[]> {
    // Validar que el userId sea un UUID válido (Supabase requiere UUIDs)
    if (!isValidUUID(userId)) {
      console.warn('userId no es un UUID válido, retornando lista vacía (modo local)');
      return [];
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, retornando lista vacía de pedidos');
      return [];
    }
    
    try {
      if (!supabase) return [];
      
      // Intentar usar delivery_orders primero, luego fallback a orders (vista)
      let data, error;
      
      // Probar con delivery_orders
      const deliveryOrdersResult = await (supabase as any)
        .from('delivery_orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            price,
            unit_price,
            products (
              id,
              name,
              brand,
              weight
            )
          )
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (deliveryOrdersResult.error || !deliveryOrdersResult.data || deliveryOrdersResult.data.length === 0) {
        // Fallback a orders (vista de compatibilidad) - sin relaciones porque es una vista
        const ordersResult = await (supabase as any)
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        data = ordersResult.data;
        error = ordersResult.error;
        
        // Si hay pedidos, obtener items por separado (porque orders es vista y no tiene relaciones)
        if (data && data.length > 0) {
          const orderIds = data.map((o: any) => o.id);
          // Obtener items con datos del producto
          const { data: itemsData } = await (supabase as any)
            .from('order_items')
            .select(`
              *,
              products (
                id,
                name,
                brand,
                weight
              )
            `)
            .in('order_id', orderIds);
          
          // Asignar items a cada pedido
          data = data.map((order: any) => ({
            ...order,
            order_items: itemsData?.filter((item: any) => item.order_id === order.id) || []
          }));
        }
      } else {
        data = deliveryOrdersResult.data;
        error = deliveryOrdersResult.error;
      }

      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }

      // Transformar datos de Supabase al formato de Order
      const transformedOrders = await Promise.all((data || []).map(async (order: any) => {
        // Obtener items del pedido (pueden venir anidados o por separado)
        let orderItems = order.order_items || [];
        
        // Si los items vienen como array vacío pero el pedido tiene ID, intentar obtenerlos por separado
        if ((!orderItems || orderItems.length === 0) && order.id) {
          console.log(`No items found for order ${order.id}, fetching separately...`);
          try {
            const { data: itemsData, error: itemsError } = await (supabase as any)
              .from('order_items')
              .select(`
                *,
                products (
                  id,
                  name,
                  brand,
                  weight
                )
              `)
              .eq('order_id', order.id);
            
            if (itemsError) {
              console.error(`Error fetching items for order ${order.id}:`, itemsError);
            } else {
              orderItems = itemsData || [];
              console.log(`Found ${orderItems.length} items for order ${order.id}`);
            }
          } catch (e) {
            console.error(`Exception fetching items for order ${order.id}:`, e);
          }
        }
        
        return {
          id: order.id,
          date: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          status: order.status || 'pending',
          total: order.total_amount || order.total || 0,
          wholesaleTotal: order.wholesale_total || order.total || 0,
          savings: order.savings || 0,
          items: orderItems.map((item: any) => ({
            id: item.product_id || item.id || '',
            name: item.products?.name || item.product_name || 'Producto',
            brand: item.products?.brand || item.product_brand || '',
            quantity: item.quantity || 0,
            unitPrice: item.unit_price || item.price || 0,
            subtotal: item.subtotal || ((item.quantity || 0) * (item.unit_price || item.price || 0)),
            weight: item.products?.weight || item.weight || '',
          })),
          trackingNumber: order.tracking_number,
          deliveryDate: order.delivery_date,
          deliveryAddress: typeof order.delivery_address === 'string' ? order.delivery_address : (order.delivery_address?.address || ''),
          deliveryTimeSlot: order.delivery_time_slot,
          paymentMethod: order.payment_method || 'Desconocido',
          isWholesale: order.is_wholesale ?? (order.wholesale_total ? true : false),
          notes: order.notes,
          userId: order.user_id || order.created_by,
        };
      }));
      
      return transformedOrders;
    } catch (error) {
      console.error('Error in getOrdersByUser:', error);
      return [];
    }
  },

  // Obtener pedido por ID
  async getOrderById(orderId: string): Promise<Order | null> {
    // Validar que el orderId sea un UUID válido
    if (!isValidUUID(orderId)) {
      console.warn('orderId no es un UUID válido, retornando null (modo local)');
      return null;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede obtener el pedido');
      return null;
    }
    
    try {
      if (!supabase) return null;
      
      // Intentar usar delivery_orders primero
      let data, error;
      
      const deliveryOrderResult = await (supabase as any)
        .from('delivery_orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            price,
            unit_price,
            products (
              id,
              name,
              brand,
              weight
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (deliveryOrderResult.error || !deliveryOrderResult.data) {
        // Fallback a orders (vista) - sin relaciones porque es una vista
        const orderResult = await (supabase as any)
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        data = orderResult.data;
        error = orderResult.error;
        
        // Si hay pedido, obtener items por separado con datos del producto
        if (data && !error) {
          const { data: itemsData } = await (supabase as any)
            .from('order_items')
            .select(`
              *,
              products (
                id,
                name,
                brand,
                weight
              )
            `)
            .eq('order_id', orderId);
          
          data = {
            ...data,
            order_items: itemsData || []
          };
        }
      } else {
        data = deliveryOrderResult.data;
        error = deliveryOrderResult.error;
      }

      if (error || !data) {
        console.error('Error fetching order:', error);
        return null;
      }

      // Obtener items del pedido
      let orderItems = data.order_items || [];
      
      // Si no hay items anidados, intentar obtenerlos por separado
      if ((!orderItems || orderItems.length === 0) && data.id) {
        console.log(`No items found for order ${data.id}, fetching separately...`);
        try {
          const { data: itemsData, error: itemsError } = await (supabase as any)
            .from('order_items')
            .select(`
              *,
              products (
                id,
                name,
                brand,
                weight
              )
            `)
            .eq('order_id', data.id);
          
          if (itemsError) {
            console.error(`Error fetching items for order ${data.id}:`, itemsError);
          } else {
            orderItems = itemsData || [];
            console.log(`Found ${orderItems.length} items for order ${data.id}`);
          }
        } catch (e) {
          console.error(`Exception fetching items for order ${data.id}:`, e);
        }
      }
      
      return {
        id: data.id,
        date: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: data.status || 'pending',
        total: data.total_amount || data.total || 0,
        wholesaleTotal: data.wholesale_total || data.total || 0,
        savings: data.savings || 0,
        items: orderItems.map((item: any) => ({
          id: item.product_id || item.id || '',
          name: item.products?.name || item.product_name || 'Producto',
          brand: item.products?.brand || item.product_brand || '',
          quantity: item.quantity || 0,
          unitPrice: item.unit_price || item.price || 0,
          subtotal: item.subtotal || ((item.quantity || 0) * (item.unit_price || item.price || 0)),
          weight: item.products?.weight || item.weight || '',
        })),
        trackingNumber: data.tracking_number,
        deliveryDate: data.delivery_date,
        deliveryAddress: typeof data.delivery_address === 'string' ? data.delivery_address : (data.delivery_address?.address || ''),
        deliveryTimeSlot: data.delivery_time_slot,
        paymentMethod: data.payment_method || 'Desconocido',
        isWholesale: data.is_wholesale ?? (data.wholesale_total ? true : false),
        notes: data.notes,
        userId: data.user_id || data.created_by,
      };
    } catch (error) {
      console.error('Error in getOrderById:', error);
      return null;
    }
  },

  // Crear nuevo pedido
  async createOrder(orderData: Omit<Order, 'id' | 'date' | 'status'>): Promise<string | null> {
    // Validar que el userId sea un UUID válido
    if (!isValidUUID(orderData.userId)) {
      console.warn('userId no es un UUID válido, no se puede crear el pedido en Supabase (modo local)');
      return null;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede crear el pedido');
      return null;
    }
    
    try {
      if (!supabase) return null;
      
      // Calcular total desde items
      const totalAmount = orderData.items.reduce((sum, item) => sum + item.subtotal, 0);

      // Intentar primero con delivery_orders (si existe)
      let order = null;
      let orderError = null;
      
      try {
        const deliveryOrderResult = await (supabase as any)
          .from('delivery_orders')
          .insert({
            order_number: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            created_by: orderData.userId,
            total: totalAmount,
            wholesale_total: orderData.wholesaleTotal || totalAmount,
            savings: orderData.savings || 0,
            status: 'pending',
            payment_status: 'pending',
            delivery_status: 'pending',
            delivery_address: orderData.deliveryAddress || null,
            delivery_address_id: orderData.deliveryAddressId || null, // Nueva relación directa
            delivery_date: orderData.deliveryDate,
            delivery_time_slot: orderData.deliveryTimeSlot,
            payment_method: orderData.paymentMethod,
            notes: orderData.notes || null,
            is_active: true,
          })
          .select()
          .single();
        
        order = deliveryOrderResult.data;
        orderError = deliveryOrderResult.error;
        
        // Si el pedido se creó exitosamente, crear los items
        if (order && !orderError) {
          console.log(`Creating ${orderData.items.length} items for order ${order.id}`);
          
          // Crear los items del pedido
          // Intentar primero con 'price', si falla intentar con 'unit_price'
          // Solo incluir product_id si es un UUID válido, de lo contrario usar null
          let orderItems = orderData.items.map(item => ({
            order_id: order.id,
            product_id: isValidUUID(item.id) ? item.id : null,
            product_name: item.name,
            product_brand: item.brand,
            quantity: item.quantity,
            price: item.unitPrice,
            subtotal: item.subtotal,
            weight: item.weight,
          }));

          console.log('Attempting to insert items with price column:', orderItems);

          let itemsError = null;
          let itemsResult = await (supabase as any)
            .from('order_items')
            .insert(orderItems)
            .select();

          itemsError = itemsResult.error;

          // Si falla porque 'price' no existe, intentar con 'unit_price'
          if (itemsError && itemsError.code === 'PGRST204' && itemsError.message?.includes('price')) {
            console.warn('Columna price no existe, intentando con unit_price');
            orderItems = orderData.items.map(item => ({
              order_id: order.id,
              product_id: isValidUUID(item.id) ? item.id : null,
              product_name: item.name,
              product_brand: item.brand,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              subtotal: item.subtotal,
              weight: item.weight,
            }));

            console.log('Attempting to insert items with unit_price column:', orderItems);

            itemsResult = await (supabase as any)
              .from('order_items')
              .insert(orderItems)
              .select();
            
            itemsError = itemsResult.error;
          }

          if (itemsError) {
            console.error('Error creating order items for delivery_orders:', itemsError);
            console.error('Items that failed to insert:', orderItems);
            // Intentar eliminar el pedido si falla la creación de items
            try {
              await (supabase as any).from('delivery_orders').delete().eq('id', order.id);
              console.log('Order deleted due to items insertion failure');
            } catch (deleteError) {
              console.error('Error deleting delivery_order after items failure:', deleteError);
            }
            orderError = itemsError;
            order = null;
          } else {
            console.log(`Order and ${itemsResult.data?.length || 0} items created successfully in delivery_orders`);
            console.log('Inserted items:', itemsResult.data);
            return order.id;
          }
        }
      } catch (e) {
        // delivery_orders no existe, continuar con orders
        orderError = { code: 'PGRST205', message: 'Table delivery_orders does not exist' };
      }

      // Si delivery_orders no existe o falla, intentar con orders
      if (orderError || !order) {
        if (orderError?.code === 'PGRST205') {
          console.warn('Tabla delivery_orders no existe, intentando con orders:', orderError);
        } else {
          console.warn('Error creating in delivery_orders, trying orders:', orderError);
        }
        
        // Intentar primero con total_amount (si orders es una tabla real)
        let fallbackResult = await (supabase as any)
          .from('orders')
          .insert({
            user_id: orderData.userId,
            total_amount: totalAmount,
            status: 'pending',
            delivery_date: orderData.deliveryDate,
            delivery_address: orderData.deliveryAddress || null,
            delivery_time_slot: orderData.deliveryTimeSlot,
            payment_method: orderData.paymentMethod,
            notes: orderData.notes || null,
          })
          .select()
          .single();

        // Si falla porque total_amount no existe, intentar sin ese campo o con otros campos
        if (fallbackResult.error && fallbackResult.error.code === 'PGRST204') {
          console.warn('Columna total_amount no existe, intentando con estructura alternativa');
          // Intentar con solo los campos básicos que probablemente existen
          fallbackResult = await (supabase as any)
            .from('orders')
            .insert({
              user_id: orderData.userId,
              status: 'pending',
              delivery_date: orderData.deliveryDate,
              delivery_address: orderData.deliveryAddress || null,
              delivery_time_slot: orderData.deliveryTimeSlot,
              payment_method: orderData.paymentMethod,
              notes: orderData.notes || null,
            })
            .select()
            .single();
        }

        if (fallbackResult.error || !fallbackResult.data) {
          console.error('Error creating order:', fallbackResult.error);
          // Si orders es una vista, no se puede insertar - retornar null
          if (fallbackResult.error?.code === '42809' || fallbackResult.error?.message?.includes('view')) {
            console.error('La tabla orders es una vista y no se puede insertar. Necesitas crear la tabla delivery_orders en Supabase.');
          }
          return null;
        }

        // Usar el pedido de fallback
        const fallbackOrder = fallbackResult.data;
        
        // Crear los items del pedido
        // Intentar primero con 'price', si falla intentar con 'unit_price'
        // Solo incluir product_id si es un UUID válido, de lo contrario usar null
        let orderItems = orderData.items.map(item => ({
          order_id: fallbackOrder.id,
          product_id: isValidUUID(item.id) ? item.id : null,
          product_name: item.name,
          product_brand: item.brand,
          quantity: item.quantity,
          price: item.unitPrice,
          subtotal: item.subtotal,
          weight: item.weight,
        }));

        let itemsError = null;
        let itemsResult = await (supabase as any)
          .from('order_items')
          .insert(orderItems);

        itemsError = itemsResult.error;

        // Si falla porque 'price' no existe, intentar con 'unit_price'
        if (itemsError && itemsError.code === 'PGRST204' && itemsError.message?.includes('price')) {
          console.warn('Columna price no existe, intentando con unit_price');
          orderItems = orderData.items.map(item => ({
            order_id: fallbackOrder.id,
            product_id: isValidUUID(item.id) ? item.id : null,
            product_name: item.name,
            product_brand: item.brand,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.subtotal,
            weight: item.weight,
          }));

          itemsResult = await (supabase as any)
            .from('order_items')
            .insert(orderItems);
          
          itemsError = itemsResult.error;
        }

        if (itemsError) {
          console.error('Error creating order items:', itemsError);
          // Intentar eliminar el pedido si falla la creación de items
          try {
            await (supabase as any).from('orders').delete().eq('id', fallbackOrder.id);
          } catch (deleteError) {
            console.error('Error deleting order after items failure:', deleteError);
          }
          return null;
        }

        return fallbackOrder.id;
      }

      // Crear los items del pedido
      // Intentar primero con 'price', si falla intentar con 'unit_price'
      // Solo incluir product_id si es un UUID válido, de lo contrario usar null
      let orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: isValidUUID(item.id) ? item.id : null,
        product_name: item.name,
        product_brand: item.brand,
        quantity: item.quantity,
        price: item.unitPrice,
        subtotal: item.subtotal,
        weight: item.weight,
      }));

      let itemsError = null;
      let itemsResult = await (supabase as any)
        .from('order_items')
        .insert(orderItems);

      itemsError = itemsResult.error;

      // Si falla porque 'price' no existe, intentar con 'unit_price'
      if (itemsError && itemsError.code === 'PGRST204' && itemsError.message?.includes('price')) {
        console.warn('Columna price no existe, intentando con unit_price');
        orderItems = orderData.items.map(item => ({
          order_id: order.id,
          product_id: isValidUUID(item.id) ? item.id : null,
          product_name: item.name,
          product_brand: item.brand,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
          weight: item.weight,
        }));

        itemsResult = await (supabase as any)
          .from('order_items')
          .insert(orderItems);
        
        itemsError = itemsResult.error;
      }

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Intentar eliminar el pedido si falla la creación de items
        try {
          await (supabase as any).from('delivery_orders').delete().eq('id', order.id);
        } catch (deleteError) {
          console.error('Error deleting order after items failure:', deleteError);
        }
        return null;
      }

      return order.id;
    } catch (error) {
      console.error('Error in createOrder:', error);
      return null;
    }
  },

  // Actualizar estado del pedido
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    // Validar que el orderId sea un UUID válido
    if (!isValidUUID(orderId)) {
      console.warn('orderId no es un UUID válido, no se puede actualizar (modo local)');
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede actualizar el estado del pedido');
      return false;
    }
    
    try {
      if (!supabase) return false;
      
      // Intentar actualizar en delivery_orders primero
      let updateError = null;
      
      const deliveryOrderUpdate = await (supabase as any)
        .from('delivery_orders')
        .update({ status })
        .eq('id', orderId);

      if (deliveryOrderUpdate.error) {
        // Fallback a orders (vista)
        const orderUpdate = await (supabase as any)
          .from('orders')
          .update({ status })
          .eq('id', orderId);
        
        updateError = orderUpdate.error;
      } else {
        updateError = deliveryOrderUpdate.error;
      }

      if (updateError) {
        console.error('Error updating order status:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      return false;
    }
  },
};

