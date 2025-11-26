import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '../data/products';
import { ordersService } from '../services/ordersService';
import { useAuth } from './AuthContext';
import { useStock } from './StockContext';
import { useMetrics } from './MetricsContext';

export interface OrderItem {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  weight: string;
}

export interface Order {
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
  deliveryTimeSlot?: string;
  paymentMethod: string;
  isWholesale: boolean;
  notes?: string;
  userId: string;
}

interface OrdersContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'date' | 'status'>) => Promise<string>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  getOrdersByUser: (userId: string) => Order[];
  getOrderById: (orderId: string) => Order | undefined;
  clearOrders: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders debe ser usado dentro de OrdersProvider');
  }
  return context;
};

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useAuth();
  const { increaseStock } = useStock();
  const { reloadMetrics } = useMetrics();

  useEffect(() => {
    if (user?.id) {
      loadOrders();
    }
  }, [user?.id]);

  const loadOrders = async () => {
    if (!user?.id) return;
    
    try {
      // Intentar cargar desde Supabase primero
      const supabaseOrders = await ordersService.getOrdersByUser(user.id);
      if (supabaseOrders.length > 0) {
        setOrders(supabaseOrders);
        return;
      }
      
      // Fallback a AsyncStorage si no hay pedidos en Supabase
      const ordersData = await AsyncStorage.getItem('orders');
      if (ordersData) {
        const localOrders = JSON.parse(ordersData);
        // Filtrar solo los pedidos del usuario actual
        const userOrders = localOrders.filter((order: Order) => order.userId === user.id);
        setOrders(userOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      // Fallback a AsyncStorage en caso de error
      try {
        const ordersData = await AsyncStorage.getItem('orders');
        if (ordersData) {
          const localOrders = JSON.parse(ordersData);
          const userOrders = localOrders.filter((order: Order) => order.userId === user.id);
          setOrders(userOrders);
        }
      } catch (e) {
        console.error('Error loading from AsyncStorage:', e);
      }
    }
  };

  const generateOrderId = (): string => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FL-${year}-${month}${day}-${random}`;
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'date' | 'status'>): Promise<string> => {
    try {
      // Intentar guardar en Supabase primero
      const supabaseOrderId = await ordersService.createOrder(orderData);
      
      if (supabaseOrderId) {
        // Si se guardó en Supabase, crear el objeto Order con el ID de Supabase
        const newOrder: Order = {
          ...orderData,
          id: supabaseOrderId,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
        };
        
        setOrders(prev => [newOrder, ...prev]);
        return supabaseOrderId;
      }
      
      // Fallback: guardar localmente si Supabase no está disponible
      const newOrder: Order = {
        ...orderData,
        id: generateOrderId(),
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
      };

      setOrders(prev => [newOrder, ...prev]);
      
      // Guardar en AsyncStorage como backup
      try {
        const ordersData = await AsyncStorage.getItem('orders');
        const existingOrders = ordersData ? JSON.parse(ordersData) : [];
        await AsyncStorage.setItem('orders', JSON.stringify([newOrder, ...existingOrders]));
      } catch (e) {
        console.error('Error saving to AsyncStorage:', e);
      }
      
      return newOrder.id;
    } catch (error) {
      console.error('Error in addOrder:', error);
      // Fallback: crear pedido local
      const newOrder: Order = {
        ...orderData,
        id: generateOrderId(),
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
      };
      setOrders(prev => [newOrder, ...prev]);
      return newOrder.id;
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
    // Obtener el pedido antes de actualizarlo para restaurar stock si se cancela
    const order = getOrderById(orderId);
    const previousStatus = order?.status;
    
    // Actualizar en Supabase primero
    const success = await ordersService.updateOrderStatus(orderId, status);
    
    // Actualizar estado local
    setOrders(prev => 
      prev.map(order => 
        order.id === orderId ? { ...order, status } : order
      )
    );
    
    // Si se cancela el pedido, restaurar stock y revertir métricas
    if (status === 'cancelled' && order && previousStatus !== 'cancelled') {
      try {
        // Restaurar stock de cada producto
        for (const item of order.items) {
          await increaseStock(item.id, item.quantity);
        }
        
        // Revertir métricas (recargar desde Supabase para obtener datos actualizados)
        if (user?.id) {
          await reloadMetrics(user.id);
        }
        
        console.log('Stock restaurado y métricas revertidas para el pedido cancelado');
      } catch (error) {
        console.error('Error restaurando stock o revirtiendo métricas:', error);
      }
    }
    
    // Si falló en Supabase pero el usuario tiene UUID válido, loguear el error
    if (!success && user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      console.warn('No se pudo actualizar el estado del pedido en Supabase, pero se actualizó localmente');
    }
  };

  const getOrdersByUser = (userId: string): Order[] => {
    return orders.filter(order => order.userId === userId);
  };

  const getOrderById = (orderId: string): Order | undefined => {
    return orders.find(order => order.id === orderId);
  };

  const clearOrders = async (): Promise<void> => {
    setOrders([]);
    await AsyncStorage.removeItem('orders');
  };

  const value: OrdersContextType = {
    orders,
    addOrder,
    updateOrderStatus,
    getOrdersByUser,
    getOrderById,
    clearOrders,
  };

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
};
