import { supabase, isSupabaseAvailable } from '../lib/supabase';

// Función para validar si un string es un UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const productsService = {
  // Obtener stock de un producto
  async getProductStock(productId: string): Promise<number> {
    // Los productos locales no tienen UUID, así que no intentar consultar Supabase
    if (!isValidUUID(productId)) {
      // Retornar 0 ya que el stock se maneja en StockContext con AsyncStorage
      return 0;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, retornando stock 0');
      return 0;
    }
    
    try {
      if (!supabase) return 0;
      
      const { data, error } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (error || !data) {
        console.error('Error fetching product stock:', error);
        return 0;
      }

      return data.stock || 0;
    } catch (error) {
      console.error('Error in getProductStock:', error);
      return 0;
    }
  },

  // Actualizar stock de un producto
  async updateProductStock(productId: string, quantity: number): Promise<boolean> {
    // Los productos locales no tienen UUID, así que no intentar actualizar en Supabase
    if (!isValidUUID(productId)) {
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede actualizar el stock');
      return false;
    }
    
    try {
      if (!supabase) return false;
      
      const { error } = await supabase
        .from('products')
        .update({ stock: Math.max(0, quantity) })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product stock:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateProductStock:', error);
      return false;
    }
  },

  // Reducir stock de un producto
  async reduceProductStock(productId: string, quantity: number): Promise<boolean> {
    try {
      // Obtener stock actual
      const currentStock = await this.getProductStock(productId);
      
      if (currentStock < quantity) {
        return false; // Stock insuficiente
      }

      return await this.updateProductStock(productId, currentStock - quantity);
    } catch (error) {
      console.error('Error in reduceProductStock:', error);
      return false;
    }
  },

  // Aumentar stock de un producto
  async increaseProductStock(productId: string, quantity: number): Promise<boolean> {
    try {
      const currentStock = await this.getProductStock(productId);
      return await this.updateProductStock(productId, currentStock + quantity);
    } catch (error) {
      console.error('Error in increaseProductStock:', error);
      return false;
    }
  },
};
