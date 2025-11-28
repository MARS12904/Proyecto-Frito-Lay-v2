import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '../data/products';
import { useStock } from './StockContext';
import { cartService } from '../services/cartService';
import { useAuth } from './AuthContext';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number; // Precio unitario (mayorista o regular)
  subtotal: number; // Cantidad * precio unitario
}

interface DeliverySchedule {
  id: string;
  date: string;
  timeSlot: string;
  address: string;
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  wholesaleTotal: number; // Total con precios mayoristas
  regularTotal: number; // Total con precios regulares
  isWholesaleMode: boolean; // Modo mayorista activo
  deliverySchedule?: DeliverySchedule;
  
  // Funciones básicas del carrito
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  
  // Funciones específicas para comerciantes
  toggleWholesaleMode: () => void;
  setDeliverySchedule: (schedule: DeliverySchedule) => void;
  clearDeliverySchedule: () => void;
  getCartSummary: () => {
    totalItems: number;
    totalPrice: number;
    wholesaleSavings: number;
    deliveryFee: number;
    finalTotal: number;
  };
  validateOrder: () => {
    isValid: boolean;
    errors: string[];
  };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isWholesaleMode, setIsWholesaleMode] = useState(true); // Por defecto modo mayorista
  const [deliverySchedule, setDeliveryScheduleState] = useState<DeliverySchedule | undefined>();
  const { isProductAvailable, reduceStock, increaseStock } = useStock();
  const { user } = useAuth();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);
  const wholesaleTotal = items.reduce((sum, item) => sum + (item.product.wholesalePrice * item.quantity), 0);
  const regularTotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  useEffect(() => {
    loadCart();
  }, []);

  // Recargar carrito cuando cambie el usuario
  useEffect(() => {
    if (user?.id) {
      loadCart();
    }
  }, [user?.id]);

  useEffect(() => {
    saveCart();
  }, [items, isWholesaleMode, deliverySchedule]);

  const loadCart = async () => {
    try {
      const userId = user?.id;
      
      // Si el usuario tiene UUID válido (está en Supabase), cargar desde Supabase
      if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        const savedCart = await cartService.getCart(userId);
        if (savedCart) {
          setItems(savedCart.items || []);
          setIsWholesaleMode(savedCart.is_wholesale_mode ?? true);
          if (savedCart.delivery_schedule) {
            setDeliveryScheduleState(savedCart.delivery_schedule);
          }
        }
      } else {
        // Fallback a AsyncStorage para usuarios locales
        const currentUserId = await AsyncStorage.getItem('currentUserId');
        const userId = currentUserId || 'guest';
        
        const cartData = await AsyncStorage.getItem(`cart_${userId}`);
        const wholesaleData = await AsyncStorage.getItem(`wholesaleMode_${userId}`);
        const deliveryData = await AsyncStorage.getItem(`deliverySchedule_${userId}`);
        
        if (cartData) {
          setItems(JSON.parse(cartData));
        }
        if (wholesaleData) {
          setIsWholesaleMode(JSON.parse(wholesaleData));
        }
        if (deliveryData) {
          setDeliveryScheduleState(JSON.parse(deliveryData));
        }
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async () => {
    try {
      const userId = user?.id;
      
      // Si el usuario tiene UUID válido (está en Supabase), guardar en Supabase
      if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        await cartService.saveCart({
          user_id: userId,
          items: items,
          is_wholesale_mode: isWholesaleMode,
          delivery_schedule: deliverySchedule,
        });
      } else {
        // Fallback a AsyncStorage para usuarios locales
        const currentUserId = await AsyncStorage.getItem('currentUserId');
        const userId = currentUserId || 'guest';
        
        await AsyncStorage.setItem(`cart_${userId}`, JSON.stringify(items));
        await AsyncStorage.setItem(`wholesaleMode_${userId}`, JSON.stringify(isWholesaleMode));
        if (deliverySchedule) {
          await AsyncStorage.setItem(`deliverySchedule_${userId}`, JSON.stringify(deliverySchedule));
        }
      }
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = async (product: Product, quantity: number = 1) => {
    // Validar cantidad mínima para comerciantes (12 productos)
    const minQty = product.minOrderQuantity || 12;
    if (isWholesaleMode && quantity < minQty) {
      quantity = minQty;
    }

    // Validar que haya stock disponible (sin reducirlo aún)
    if (!isProductAvailable(product.id, quantity)) {
      return; // no agregar si no hay stock
    }

    const existingItem = items.find(item => item.product.id === product.id);
    const unitPrice = isWholesaleMode ? product.wholesalePrice : product.price;

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      
      // Validar stock total disponible
      if (!isProductAvailable(product.id, newQuantity)) {
        return; // sin cambios si no hay stock suficiente
      }
      
      setItems(prevItems => prevItems.map(item =>
        item.product.id === product.id
          ? {
              ...item,
              quantity: newQuantity,
              unitPrice,
              subtotal: newQuantity * unitPrice
            }
          : item
      ));
    } else {
      setItems(prevItems => [...prevItems, {
        product,
        quantity,
        unitPrice,
        subtotal: quantity * unitPrice
      }]);
    }
  };

  const removeFromCart = async (productId: string) => {
    // No necesitamos aumentar el stock porque nunca lo redujimos
    setItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const item = items.find(i => i.product.id === productId);
    if (!item) return;
    
    // Validar cantidad mínima (12 productos)
    const minQty = item.product.minOrderQuantity || 12;
    if (isWholesaleMode && quantity < minQty) {
      quantity = minQty;
    }
    
    // Validar que haya stock disponible (sin reducirlo aún)
    if (!isProductAvailable(productId, quantity)) {
      return; // sin cambios si no hay stock suficiente
    }
    
    const unitPrice = isWholesaleMode ? item.product.wholesalePrice : item.product.price;
    setItems(prevItems => prevItems.map(it => it.product.id === productId ? {
      ...it,
      quantity: quantity,
      unitPrice,
      subtotal: quantity * unitPrice
    } : it));
  };

  const clearCart = async () => {
    setItems([]);
    // Limpiar también la programación de entrega al vaciar el carrito
    setDeliveryScheduleState(undefined);
    try {
      const currentUserId = await AsyncStorage.getItem('currentUserId');
      const userId = currentUserId || 'guest';
      await AsyncStorage.removeItem(`deliverySchedule_${userId}`);
    } catch (error) {
      console.error('Error clearing delivery schedule:', error);
    }
  };

  const isInCart = (productId: string) => {
    return items.some(item => item.product.id === productId);
  };

  const toggleWholesaleMode = () => {
    const newMode = !isWholesaleMode;
    setIsWholesaleMode(newMode);
    
    // Actualizar precios en el carrito
    setItems(prevItems =>
      prevItems.map(item => {
        const unitPrice = newMode ? item.product.wholesalePrice : item.product.price;
        return {
          ...item,
          unitPrice,
          subtotal: item.quantity * unitPrice
        };
      })
    );
  };

  const setDeliverySchedule = (schedule: DeliverySchedule) => {
    setDeliveryScheduleState(schedule);
  };

  const clearDeliverySchedule = () => {
    setDeliveryScheduleState(undefined);
  };

  const getCartSummary = () => {
    const deliveryFee = deliverySchedule ? 15.00 : 0; // Tarifa de envío programado
    const wholesaleSavings = regularTotal - wholesaleTotal;
    const finalTotal = totalPrice + deliveryFee;

    return {
      totalItems,
      totalPrice,
      wholesaleSavings,
      deliveryFee,
      finalTotal
    };
  };

  const validateOrder = () => {
    const errors: string[] = [];

    if (items.length === 0) {
      errors.push('El carrito está vacío');
    }

    items.forEach(item => {
      const minQty = item.product.minOrderQuantity || 12;
      if (isWholesaleMode && item.quantity < minQty) {
        errors.push(`${item.product.name}: cantidad mínima es ${minQty}`);
      }
      if (!item.product.isAvailable) {
        errors.push(`${item.product.name}: producto no disponible`);
      }
    });

    if (isWholesaleMode && !deliverySchedule) {
      errors.push('Debe programar una entrega para pedidos mayoristas');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const value: CartContextType = {
    items,
    totalItems,
    totalPrice,
    wholesaleTotal,
    regularTotal,
    isWholesaleMode,
    deliverySchedule,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
    toggleWholesaleMode,
    setDeliverySchedule,
    clearDeliverySchedule,
    getCartSummary,
    validateOrder,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
