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
  refreshStockFromDB: () => Promise<void>;
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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadStock();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveStock();
    }
  }, [stock, isLoaded]);

  // Cargar stock desde Supabase y luego combinar con datos locales
  const loadStock = async () => {
    try {
      // 1. Primero intentar cargar desde Supabase
      const supabaseStock = await productsService.getAllProductsStock();
      
      // 2. Cargar también el stock guardado localmente como respaldo
      const localStockData = await AsyncStorage.getItem('productStock');
      const localStock: Record<string, number> = localStockData ? JSON.parse(localStockData) : {};
      
      // 3. Combinar: Supabase tiene prioridad, luego local, luego valores por defecto
      const combinedStock: Record<string, number> = {};
      
      products.forEach(product => {
        // Prioridad: Supabase > AsyncStorage > valor por defecto del producto
        const supabaseValue = supabaseStock[product.id] ?? supabaseStock[product.name.toLowerCase()];
        const localValue = localStock[product.id];
        
        if (typeof supabaseValue === 'number') {
          combinedStock[product.id] = supabaseValue;
        } else if (typeof localValue === 'number') {
          combinedStock[product.id] = localValue;
        } else {
          combinedStock[product.id] = product.stock;
        }
      });
      
      setStock(combinedStock);
      setIsLoaded(true);
      console.log('Stock cargado correctamente');
    } catch (error) {
      console.error('Error loading stock:', error);
      // En caso de error, usar valores por defecto
      await initializeStock();
    }
  };

  // Refrescar stock desde la base de datos
  const refreshStockFromDB = async (): Promise<void> => {
    await loadStock();
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
    setIsLoaded(true);
  };

  // Asegurar sincronización si cambia la lista de productos en caliente
  useEffect(() => {
    if (!isLoaded) return;
    
    setStock(prev => {
      const merged: Record<string, number> = {};
      products.forEach(product => {
        const existing = prev[product.id];
        merged[product.id] = typeof existing === 'number' ? existing : product.stock;
      });
      return merged;
    });
  }, [products.length, isLoaded]);

  const updateStock = async (productId: string, quantity: number): Promise<void> => {
    const newQuantity = Math.max(0, quantity);
    
    // Actualizar estado local
    setStock(prev => ({
      ...prev,
      [productId]: newQuantity
    }));
    
    // Actualizar en Supabase
    try {
      await productsService.updateProductStock(productId, newQuantity);
    } catch (error) {
      console.error('Error actualizando stock en Supabase:', error);
    }
  };

  const reduceStock = async (productId: string, quantity: number): Promise<boolean> => {
    const currentStock = stock[productId] || 0;
    
    if (currentStock < quantity) {
      console.warn(`Stock insuficiente para ${productId}: disponible ${currentStock}, requerido ${quantity}`);
      return false;
    }
    
    const newStock = Math.max(0, currentStock - quantity);
    
    // Actualizar estado local primero
    setStock(prev => ({
      ...prev,
      [productId]: newStock
    }));
    
    // Intentar actualizar en Supabase (si el producto existe allí)
    try {
      await productsService.reduceProductStock(productId, quantity);
      // No mostrar warning si retorna false - simplemente el producto no está en Supabase
    } catch (error) {
      // Ignorar errores de Supabase, el stock local ya se actualizó
    }
    
    console.log(`Stock reducido: ${productId} de ${currentStock} a ${newStock}`);
    return true;
  };

  const increaseStock = async (productId: string, quantity: number): Promise<void> => {
    const currentStock = stock[productId] || 0;
    const newStock = currentStock + Math.max(0, quantity);
    
    // Actualizar estado local
    setStock(prev => ({
      ...prev,
      [productId]: newStock
    }));
    
    // Intentar actualizar en Supabase (si el producto existe allí)
    try {
      await productsService.increaseProductStock(productId, quantity);
    } catch (error) {
      // Ignorar errores, el stock local ya se actualizó
    }
    
    console.log(`Stock aumentado: ${productId} de ${currentStock} a ${newStock}`);
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
    refreshStockFromDB,
  };

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
};
