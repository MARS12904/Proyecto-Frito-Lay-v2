import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { metricsService } from '../services/metricsService';

export interface UserMetrics {
  userId: string;
  totalOrders: number;
  totalSpent: number;
  totalSavings: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  favoriteBrand?: string;
  monthlyGoal: number;
  monthlyProgress: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    type: 'order' | 'payment' | 'reorder';
    description: string;
    date: string;
    amount: number;
  }>;
}

interface MetricsContextType {
  metrics: Record<string, UserMetrics>;
  updateMetrics: (userId: string, orderData: {
    total: number;
    savings: number;
    items: Array<{ name: string; brand: string; quantity: number; subtotal: number }>;
  }) => Promise<void>;
  revertMetrics: (userId: string, orderData: {
    total: number;
    savings: number;
  }) => Promise<void>;
  getUserMetrics: (userId: string) => UserMetrics;
  reloadMetrics: (userId: string) => Promise<void>;
  resetMetrics: (userId: string) => Promise<void>;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics debe ser usado dentro de MetricsProvider');
  }
  return context;
};

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<Record<string, UserMetrics>>({});

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    saveMetrics();
  }, [metrics]);

  const loadMetrics = async () => {
    try {
      const metricsData = await AsyncStorage.getItem('userMetrics');
      if (metricsData) {
        setMetrics(JSON.parse(metricsData));
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const saveMetrics = async () => {
    try {
      await AsyncStorage.setItem('userMetrics', JSON.stringify(metrics));
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  };

  const getUserMetrics = (userId: string): UserMetrics => {
    if (!metrics[userId]) {
      // Crear métricas por defecto si no existen
      const defaultMetrics: UserMetrics = {
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
      // No usar setMetrics aquí para evitar el error de renderizado
      return defaultMetrics;
    }
    return metrics[userId];
  };

  const updateMetrics = async (userId: string, orderData: {
    total: number;
    savings: number;
    items: Array<{ name: string; brand: string; quantity: number; subtotal: number }>;
  }): Promise<void> => {
    const currentMetrics = getUserMetrics(userId);
    const newTotalOrders = currentMetrics.totalOrders + 1;
    const newTotalSpent = currentMetrics.totalSpent + orderData.total;
    const newTotalSavings = currentMetrics.totalSavings + orderData.savings;
    const newAverageOrderValue = newTotalSpent / newTotalOrders;

    // Actualizar productos top
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    
    // Agregar productos existentes
    currentMetrics.topProducts.forEach(product => {
      productMap.set(product.name, { quantity: product.quantity, revenue: product.revenue });
    });

    // Agregar productos del nuevo pedido
    orderData.items.forEach(item => {
      const existing = productMap.get(item.name) || { quantity: 0, revenue: 0 };
      productMap.set(item.name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.subtotal
      });
    });

    // Convertir a array y ordenar por revenue
    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    // Determinar marca favorita
    const brandMap = new Map<string, number>();
    orderData.items.forEach(item => {
      const count = brandMap.get(item.brand) || 0;
      brandMap.set(item.brand, count + item.quantity);
    });
    const favoriteBrand = Array.from(brandMap.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || currentMetrics.favoriteBrand;

    // Agregar actividad reciente
    const newActivity = {
      type: 'order' as const,
      description: `Pedido completado`,
      date: new Date().toISOString().split('T')[0],
      amount: orderData.total,
    };

    const updatedMetrics: UserMetrics = {
      ...currentMetrics,
      totalOrders: newTotalOrders,
      totalSpent: newTotalSpent,
      totalSavings: newTotalSavings,
      averageOrderValue: newAverageOrderValue,
      lastOrderDate: new Date().toISOString().split('T')[0],
      favoriteBrand,
      monthlyProgress: Math.min(currentMetrics.monthlyProgress + orderData.total, currentMetrics.monthlyGoal),
      topProducts,
      recentActivity: [newActivity, ...currentMetrics.recentActivity].slice(0, 10), // Mantener solo las últimas 10
    };

    setMetrics(prev => ({ ...prev, [userId]: updatedMetrics }));
  };

  const revertMetrics = async (userId: string, orderData: {
    total: number;
    savings: number;
  }): Promise<void> => {
    // Recargar métricas desde Supabase para obtener datos actualizados
    await reloadMetrics(userId);
  };

  const reloadMetrics = async (userId: string): Promise<void> => {
    try {
      // Obtener métricas actualizadas desde Supabase
      const updatedMetrics = await metricsService.getUserMetrics(userId);
      setMetrics(prev => ({ ...prev, [userId]: updatedMetrics }));
    } catch (error) {
      console.error('Error recargando métricas desde Supabase:', error);
      // Si falla, revertir localmente como fallback
      const currentMetrics = getUserMetrics(userId);
      // No hacer nada si falla, las métricas locales ya están actualizadas
    }
  };

  const resetMetrics = async (userId: string): Promise<void> => {
    setMetrics(prev => {
      const newMetrics = { ...prev };
      delete newMetrics[userId];
      return newMetrics;
    });
  };

  const value: MetricsContextType = {
    metrics,
    updateMetrics,
    revertMetrics,
    getUserMetrics,
    reloadMetrics,
    resetMetrics,
  };

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
};


