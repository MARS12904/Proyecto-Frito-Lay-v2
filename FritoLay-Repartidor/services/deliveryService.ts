import { supabase, isSupabaseAvailable } from '../lib/supabase';

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  repartidor_id: string;
  assigned_at: string;
  status: 'assigned' | 'in_transit' | 'delivered' | 'failed';
  started_at?: string;
  completed_at?: string;
  delivery_notes?: string;
  delivery_photo_url?: string;
  client_signature_url?: string;
  rating?: number;
  created_at: string;
  updated_at: string;
  order?: DeliveryOrder;
}

export interface DeliveryOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  delivery_address: string;
  delivery_zone?: string;
  delivery_reference?: string;
  delivery_date?: string;
  delivery_time_slot?: string;
  notes?: string;
  delivery_status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';
  payment_method?: string;
  payment_status?: string;
  created_at: string;
  items?: OrderItem[];
  customer?: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface OrderItem {
  id: string;
  product_name: string;
  product_brand?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export class DeliveryService {
  // Obtener todas las asignaciones del repartidor
  static async getMyAssignments(repartidorId: string): Promise<DeliveryAssignment[]> {
    if (!isSupabaseAvailable() || !supabase) {
      throw new Error('Supabase no está disponible');
    }

    // Obtener las asignaciones usando repartidor_id
    const { data: assignments, error: assignmentsError } = await supabase
      .from('delivery_assignments')
      .select('*')
      .eq('repartidor_id', repartidorId)
      .order('assigned_at', { ascending: false });

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      throw assignmentsError;
    }

    if (!assignments || assignments.length === 0) {
      console.log('No assignments found for repartidor:', repartidorId);
      return [];
    }

    console.log(`Found ${assignments.length} assignments for repartidor ${repartidorId}`);

    // Obtener los IDs de las órdenes
    const orderIds = assignments.map(a => a.order_id).filter(Boolean);

    if (orderIds.length === 0) {
      return assignments.map(a => ({ ...a, order: undefined }));
    }

    // Obtener las órdenes - intentar primero con delivery_orders
    let orders: any[] = [];
    let ordersError: any = null;

    const { data: deliveryOrders, error: deliveryOrdersError } = await supabase
      .from('delivery_orders')
      .select('*')
      .in('id', orderIds);

    if (deliveryOrdersError) {
      console.error('Error fetching delivery_orders:', deliveryOrdersError);
      ordersError = deliveryOrdersError;
    } else if (deliveryOrders && deliveryOrders.length > 0) {
      orders = deliveryOrders;
    } else {
      // Si no se encuentran en delivery_orders, intentar con orders
      const { data: regularOrders, error: regularOrdersError } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds);

      if (regularOrdersError) {
        console.error('Error fetching orders:', regularOrdersError);
        ordersError = regularOrdersError;
      } else if (regularOrders) {
        // Transformar orders al formato de delivery_orders
        orders = regularOrders.map((o: any) => ({
          ...o,
          order_number: o.id.slice(0, 8),
          total: o.total_amount || 0,
          delivery_status: o.status === 'delivered' ? 'delivered' : 
                          o.status === 'cancelled' ? 'cancelled' : 'pending',
          created_by: o.user_id,
        }));
      }
    }

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      // Retornar asignaciones sin órdenes en caso de error
      return assignments.map(a => ({ ...a, order: undefined }));
    }

    // Obtener los items de las órdenes
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    // Obtener direcciones si delivery_address es UUID
    const addressIds = orders
      ?.filter((o: any) => o.delivery_address && typeof o.delivery_address === 'string' && o.delivery_address.length === 36)
      .map((o: any) => o.delivery_address)
      .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index) || [];

    let addressMap = new Map();
    if (addressIds.length > 0) {
      const { data: addresses } = await supabase
        .from('delivery_addresses')
        .select('id, address, zone, reference')
        .in('id', addressIds);

      if (addresses) {
        addresses.forEach((addr: any) => {
          addressMap.set(addr.id, {
            address: addr.address,
            zone: addr.zone,
            reference: addr.reference,
          });
        });
      }
    }

    // Obtener información de clientes
    const customerIds = orders
      ?.map((o: any) => o.created_by)
      .filter(Boolean)
      .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index) || [];

    let customerMap = new Map();
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('user_profiles')
        .select('id, name, email, phone')
        .in('id', customerIds);

      if (customers) {
        customers.forEach((customer: any) => {
          customerMap.set(customer.id, {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          });
        });
      }
    }

    // Combinar los datos
    const assignmentsWithOrders: DeliveryAssignment[] = assignments.map(assignment => {
      const order = orders?.find(o => o.id === assignment.order_id);
      const items = orderItems?.filter(item => item.order_id === assignment.order_id) || [];

      // Mapear items a OrderItem
      const itemsWithProducts: OrderItem[] = items.map(item => ({
        id: item.id,
        product_name: item.product_name || 'Producto',
        product_brand: item.product_brand || undefined,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        subtotal: Number(item.subtotal) || (Number(item.quantity) || 0) * (Number(item.price) || 0),
      }));

      // Si no hay orden, retornar asignación sin orden
      if (!order) {
        return {
          ...assignment,
          order: undefined,
        };
      }

      // Obtener dirección: puede ser UUID (referencia) o texto directo
      let deliveryAddress = '';
      let deliveryZone = '';
      let deliveryReference = '';
      
      if (order.delivery_address) {
        if (typeof order.delivery_address === 'string' && order.delivery_address.length === 36) {
          // Es un UUID, buscar en el mapa
          const addressData = addressMap.get(order.delivery_address);
          if (addressData) {
            deliveryAddress = addressData.address || '';
            deliveryZone = addressData.zone || '';
            deliveryReference = addressData.reference || '';
          } else {
            deliveryAddress = order.delivery_address;
          }
        } else {
          // Es texto directo
          deliveryAddress = order.delivery_address;
        }
      }

      // Obtener información del cliente
      const customer = order.created_by ? customerMap.get(order.created_by) : null;

      return {
        ...assignment,
        order: order ? {
          id: order.id,
          order_number: order.order_number || order.id.slice(0, 8),
          status: order.status,
          total: Number(order.total) || 0,
          delivery_address: deliveryAddress,
          delivery_zone: deliveryZone,
          delivery_reference: deliveryReference,
          delivery_date: order.delivery_date,
          delivery_time_slot: order.delivery_time_slot,
          notes: order.notes,
          delivery_status: order.delivery_status || 'pending',
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          created_at: order.created_at,
          items: itemsWithProducts,
          customer: customer || undefined,
        } : undefined,
      };
    });

    return assignmentsWithOrders;
  }

  // Obtener una asignación específica
  static async getAssignment(assignmentId: string): Promise<DeliveryAssignment | null> {
    if (!isSupabaseAvailable() || !supabase) {
      throw new Error('Supabase no está disponible');
    }

    // Obtener la asignación
    const { data: assignment, error: assignmentError } = await supabase
      .from('delivery_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (assignmentError) {
      console.error('Error fetching assignment:', assignmentError);
      return null;
    }

    if (!assignment) {
      return null;
    }

    // Obtener la orden - intentar primero con delivery_orders
    let order: any = null;
    let orderError: any = null;

    const { data: deliveryOrder, error: deliveryOrderError } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('id', assignment.order_id)
      .maybeSingle();

    if (deliveryOrderError) {
      console.error('Error fetching delivery_order:', deliveryOrderError);
      orderError = deliveryOrderError;
    } else if (deliveryOrder) {
      order = deliveryOrder;
    } else {
      // Si no se encuentra en delivery_orders, intentar con orders
      const { data: regularOrder, error: regularOrderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', assignment.order_id)
        .maybeSingle();

      if (regularOrderError) {
        console.error('Error fetching order:', regularOrderError);
        orderError = regularOrderError;
      } else if (regularOrder) {
        // Transformar order al formato de delivery_order
        order = {
          ...regularOrder,
          order_number: regularOrder.id.slice(0, 8),
          total: regularOrder.total_amount || 0,
          delivery_status: regularOrder.status === 'delivered' ? 'delivered' : 
                          regularOrder.status === 'cancelled' ? 'cancelled' : 'pending',
          created_by: regularOrder.user_id,
        };
      }
    }

    if (orderError) {
      console.error('Error fetching order:', orderError);
      // Si es un error de permisos, informar mejor
      if (orderError.code === 'PGRST301' || orderError.message?.includes('permission')) {
        console.error('Permission denied - check RLS policies for delivery_orders');
      }
      return { ...assignment, order: undefined };
    }

    if (!order) {
      console.warn('Order not found for assignment:', assignment.order_id);
      console.warn('Assignment order_id:', assignment.order_id);
      console.warn('Tried both delivery_orders and orders tables');
      return { ...assignment, order: undefined };
    }

    console.log('Order found:', order.id, 'Items count:', orderItems?.length || 0);

    // Obtener información del cliente
    let customerInfo: any = null;
    if (order.created_by) {
      const { data: customer } = await supabase
        .from('user_profiles')
        .select('id, name, email, phone')
        .eq('id', order.created_by)
        .maybeSingle();
      
      customerInfo = customer;
    }

    // Obtener los items de la orden
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', assignment.order_id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    // Obtener dirección si es UUID
    let deliveryAddress = '';
    let deliveryZone = '';
    let deliveryReference = '';
    
    if (order?.delivery_address) {
      if (typeof order.delivery_address === 'string' && order.delivery_address.length === 36) {
        // Es un UUID, obtener de delivery_addresses
        const { data: addressData } = await supabase
          .from('delivery_addresses')
          .select('address, zone, reference')
          .eq('id', order.delivery_address)
          .maybeSingle();
        
        if (addressData) {
          deliveryAddress = addressData.address || '';
          deliveryZone = addressData.zone || '';
          deliveryReference = addressData.reference || '';
        } else {
          deliveryAddress = order.delivery_address;
        }
      } else {
        // Es texto directo
        deliveryAddress = order.delivery_address;
      }
    }

    // Combinar los datos
    const itemsWithProducts: OrderItem[] = (orderItems || []).map(item => ({
      id: item.id,
      product_name: item.product_name || 'Producto',
      product_brand: item.product_brand || undefined,
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
      subtotal: Number(item.subtotal) || (Number(item.quantity) || 0) * (Number(item.price) || 0),
    }));

    return {
      ...assignment,
      order: {
        id: order.id,
        order_number: order.order_number || order.id.slice(0, 8),
        status: order.status,
        total: Number(order.total) || 0,
        delivery_address: deliveryAddress,
        delivery_zone: deliveryZone,
        delivery_reference: deliveryReference,
        delivery_date: order.delivery_date,
        delivery_time_slot: order.delivery_time_slot,
        notes: order.notes,
        delivery_status: order.delivery_status || 'pending',
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        created_at: order.created_at,
        items: itemsWithProducts,
        customer: customerInfo ? {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
        } : undefined,
      },
    };
  }

  // Actualizar estado de la asignación
  static async updateAssignmentStatus(
    assignmentId: string,
    status: 'assigned' | 'in_transit' | 'delivered' | 'failed',
    notes?: string
  ): Promise<boolean> {
    if (!isSupabaseAvailable() || !supabase) {
      throw new Error('Supabase no está disponible');
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.delivery_notes = notes;
    }

    // Si cambia a in_transit, registrar started_at
    if (status === 'in_transit') {
      updateData.started_at = new Date().toISOString();
    }

    // Si cambia a delivered o failed, registrar completed_at
    if (status === 'delivered' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('delivery_assignments')
      .update(updateData)
      .eq('id', assignmentId);

    if (error) {
      console.error('Error updating assignment:', error);
      return false;
    }

    // Actualizar también el estado de la orden en delivery_orders
    const assignment = await this.getAssignment(assignmentId);
    if (assignment?.order_id) {
      let orderStatus: string = status;
      if (status === 'assigned') orderStatus = 'assigned';
      if (status === 'in_transit') orderStatus = 'in_transit';
      if (status === 'delivered') orderStatus = 'delivered';
      if (status === 'failed') orderStatus = 'failed';

      // Actualizar delivery_status en delivery_orders
      const { error: orderUpdateError } = await supabase
        .from('delivery_orders')
        .update({ 
          delivery_status: orderStatus as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.order_id);

      if (orderUpdateError) {
        console.error('Error updating delivery_orders status:', orderUpdateError);
        // No fallar si esto falla, la asignación ya se actualizó
      }
    }

    return true;
  }

  // Subir foto de entrega
  static async uploadDeliveryPhoto(
    assignmentId: string,
    photoUri: string
  ): Promise<string | null> {
    if (!isSupabaseAvailable() || !supabase) {
      throw new Error('Supabase no está disponible');
    }

    try {
      // Convertir la URI a blob
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const fileExt = photoUri.split('.').pop();
      const fileName = `${assignmentId}_${Date.now()}.${fileExt}`;
      const filePath = `delivery-photos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('deliveries')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
        });

      if (error) {
        console.error('Error uploading photo:', error);
        return null;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('deliveries')
        .getPublicUrl(filePath);

      // Actualizar la asignación con la URL de la foto
      await supabase
        .from('delivery_assignments')
        .update({ delivery_photo_url: urlData.publicUrl })
        .eq('id', assignmentId);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error processing photo:', error);
      return null;
    }
  }

  // Registrar ubicación de tracking
  static async trackLocation(
    assignmentId: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<boolean> {
    if (!isSupabaseAvailable() || !supabase) {
      throw new Error('Supabase no está disponible');
    }

    const { error } = await supabase
      .from('delivery_tracking')
      .insert({
        assignment_id: assignmentId,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error('Error tracking location:', error);
      return false;
    }

    return true;
  }
}



