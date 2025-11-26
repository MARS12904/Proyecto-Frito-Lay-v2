import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, products } from '../data/products';
import { productsService } from '../services/productsService';

interface StockContextType {
  stock: Record<string, number>;
  updateStock: (productId: string, quantity: number) => Promise<void>;
  reduceStock: (productId: string, quantity: number) => Promise<boolean>;
  increaseStock: (productId: string, quantity: number) => Promise<void>;
  getProductStock: (productId: string) => number;
  isProductAvailable: (productId: string, quantity: number) => boolean;
  initializeStock: () => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStock debe ser usado dentro de StockProvider');
  }
  return context;
};

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stock, setStock] = useState<Record<string, number>>({});

  useEffect(() => {
    loadStock();
  }, []);

  useEffect(() => {
    saveStock();
  }, [stock]);

  const loadStock = async () => {
    try {
      const stockData = await AsyncStorage.getItem('productStock');
      if (stockData) {
        const stored: Record<string, number> = JSON.parse(stockData);
        // Sincronizar con lista actual de productos: agregar faltantes y remover obsoletos
        const synced: Record<string, number> = {};
        products.forEach(product => {
          const existing = stored[product.id];
          synced[product.id] = typeof existing === 'number' ? existing : product.stock;
        });
        setStock(synced);
      } else {
        // Inicializar stock con los valores por defecto de los productos
        await initializeStock();
      }
    } catch (error) {
      console.error('Error loading stock:', error);
    }
  };

  const saveStock = async () => {
    try {
      await AsyncStorage.setItem('productStock', JSON.stringify(stock));
    } catch (error) {
      console.error('Error saving stock:', error);
    }
  };

  const initializeStock = async (): Promise<void> => {
    const initialStock: Record<string, number> = {};
    products.forEach(product => {
      initialStock[product.id] = product.stock;
    });
    setStock(initialStock);
  };

  // Asegurar sincronización si cambia la lista de productos en caliente
  useEffect(() => {
    // Reconstruir mapa garantizando claves presentes
    setStock(prev => {
      const merged: Record<string, number> = {};
      products.forEach(product => {
        const existing = prev[product.id];
        merged[product.id] = typeof existing === 'number' ? existing : product.stock;
      });
      return merged;
    });
  }, [products.length]);

  const updateStock = async (productId: string, quantity: number): Promise<void> => {
    setStock(prev => ({
      ...prev,
      [productId]: Math.max(0, quantity)
    }));
  };

  const reduceStock = async (productId: string, quantity: number): Promise<boolean> => {
    const currentStock = stock[productId] || 0;
    if (currentStock >= quantity) {
      setStock(prev => ({
        ...prev,
        [productId]: Math.max(0, currentStock - quantity)
      }));
      return true;
    }
    return false;
  };

  const increaseStock = async (productId: string, quantity: number): Promise<void> => {
    const currentStock = stock[productId] || 0;
    const newStock = currentStock + Math.max(0, quantity);
    
    // Actualizar estado local
    setStock(prev => ({
      ...prev,
      [productId]: newStock
    }));
    
    // Actualizar en Supabase si el producto tiene UUID válido
    try {
      await productsService.increaseProductStock(productId, quantity);
    } catch (error) {
      console.error('Error actualizando stock en Supabase:', error);
      // Continuar aunque falle Supabase, el stock local ya se actualizó
    }
  };

  const getProductStock = (productId: string): number => {
    return stock[productId] || 0;
  };

  const isProductAvailable = (productId: string, quantity: number): boolean => {
    const currentStock = stock[productId] || 0;
    return currentStock >= quantity;
  };

  const value: StockContextType = {
    stock,
    updateStock,
    reduceStock,
    increaseStock,
    getProductStock,
    isProductAvailable,
    initializeStock,
  };

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
};
