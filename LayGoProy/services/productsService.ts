import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { Product } from '../data/products';

// Función para validar si un string es un UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Imagen por defecto para productos sin imagen
const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&q=80';

// Convertir producto de Supabase a formato local
const convertSupabaseProduct = (dbProduct: any): Product => {
  // Validar que la imagen sea una URL válida
  let imageUrl = DEFAULT_PRODUCT_IMAGE;
  if (dbProduct.image && typeof dbProduct.image === 'string' && dbProduct.image.startsWith('http')) {
    imageUrl = dbProduct.image;
  }

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    brand: dbProduct.brand || 'Frito Lay',
    category: dbProduct.category?.toLowerCase().replace(/\s+/g, '-') || 'otros',
    subcategory: dbProduct.category?.toLowerCase() || 'general',
    price: Number(dbProduct.price) || 0,
    wholesalePrice: Number(dbProduct.wholesale_price) || Number(dbProduct.price) * 0.8,
    image: imageUrl,
    description: dbProduct.description || dbProduct.name,
    weight: dbProduct.weight || '',
    unit: 'unidad',
    stock: Number(dbProduct.stock) || 0,
    minOrderQuantity: Number(dbProduct.min_order_quantity) || 1,
    maxOrderQuantity: Number(dbProduct.max_order_quantity) || 100,
    isAvailable: dbProduct.is_available !== false,
    isWholesale: true,
    tags: Array.isArray(dbProduct.tags) ? dbProduct.tags : [],
  };
};

export const productsService = {
  // Obtener todos los productos desde Supabase
  async getAllProducts(): Promise<Product[]> {
    if (!isSupabaseAvailable() || !supabase) {
      console.warn('Supabase no disponible, retornando array vacío');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products from Supabase:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No hay productos en Supabase');
        return [];
      }

      const products = data.map(convertSupabaseProduct);
      console.log(`✅ Cargados ${products.length} productos desde Supabase`);
      return products;
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      return [];
    }
  },

  // Obtener un producto por ID desde Supabase
  async getProductById(productId: string): Promise<Product | null> {
    if (!isSupabaseAvailable() || !supabase || !isValidUUID(productId)) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error || !data) {
        return null;
      }

      return convertSupabaseProduct(data);
    } catch (error) {
      console.error('Error in getProductById:', error);
      return null;
    }
  },

  // Obtener categorías únicas de productos
  async getCategories(): Promise<string[]> {
    if (!isSupabaseAvailable() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('is_available', true);

      if (error || !data) {
        return [];
      }

      const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
      return categories;
    } catch (error) {
      console.error('Error in getCategories:', error);
      return [];
    }
  },
  // Obtener todos los productos de Supabase con su stock
  async getAllProductsStock(): Promise<Record<string, number>> {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible para obtener stock');
      return {};
    }
    
    try {
      if (!supabase) return {};
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock');

      if (error || !data) {
        console.error('Error fetching all products stock:', error);
        return {};
      }

      // Crear un mapa de stock usando tanto el ID como el nombre del producto
      const stockMap: Record<string, number> = {};
      data.forEach((product: any) => {
        stockMap[product.id] = product.stock || 0;
        // También mapear por nombre para productos locales
        if (product.name) {
          stockMap[product.name.toLowerCase()] = product.stock || 0;
        }
      });

      console.log('Stock cargado desde Supabase:', Object.keys(stockMap).length, 'productos');
      return stockMap;
    } catch (error) {
      console.error('Error in getAllProductsStock:', error);
      return {};
    }
  },

  // Obtener stock de un producto (por UUID o por nombre)
  // Retorna null si el producto no existe en Supabase, o el número de stock si existe
  async getProductStock(productId: string): Promise<number | null> {
    if (!isSupabaseAvailable()) {
      return null; // Supabase no disponible
    }
    
    try {
      if (!supabase) return null;
      
      let data, error;
      
      if (isValidUUID(productId)) {
        const result = await supabase.from('products').select('stock').eq('id', productId).single();
        data = result.data;
        error = result.error;
      } else {
        // Extraer el nombre del producto del ID (ej: "cheetos-mega-queso-150g" -> "Cheetos Mega Queso")
        const productName = productId
          .replace(/-\d+g$/, '') // Quitar el peso al final
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        const result = await supabase
          .from('products')
          .select('id, name, stock')
          .ilike('name', `%${productName}%`)
          .limit(1);
        
        if (result.data && result.data.length > 0) {
          data = result.data[0];
        }
        error = result.error;
      }

      if (error || !data) {
        // Producto no existe en Supabase
        return null;
      }

      return data.stock ?? 0;
    } catch (error) {
      console.error('Error in getProductStock:', error);
      return null;
    }
  },

  // Actualizar stock de un producto (por UUID o por nombre)
  async updateProductStock(productId: string, newStock: number): Promise<boolean> {
    if (!isSupabaseAvailable() || !supabase) {
      return false;
    }
    
    try {
      const stockValue = Math.max(0, newStock);
      let result;

      if (isValidUUID(productId)) {
        result = await supabase
          .from('products')
          .update({ stock: stockValue, updated_at: new Date().toISOString() })
          .eq('id', productId);
      } else {
        // Extraer el nombre del producto del ID
        const productName = productId
          .replace(/-\d+g$/, '')
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        result = await supabase
          .from('products')
          .update({ stock: stockValue, updated_at: new Date().toISOString() })
          .ilike('name', `%${productName}%`);
      }

      if (result.error) {
        // No loguear error si simplemente no se encontró el producto
        return false;
      }

      console.log(`[Supabase] Stock actualizado: ${productId} -> ${stockValue}`);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Reducir stock de un producto en Supabase
  // Retorna true si se actualizó, false si el producto no existe en Supabase
  async reduceProductStock(productId: string, quantity: number): Promise<boolean> {
    try {
      const currentStock = await this.getProductStock(productId);
      
      // Si el producto no existe en Supabase (null), retornar false sin error
      if (currentStock === null) {
        return false; // Producto no está en Supabase, solo se maneja localmente
      }

      if (currentStock < quantity) {
        console.warn(`[Supabase] Stock insuficiente para ${productId}: tiene ${currentStock}, necesita ${quantity}`);
        return false;
      }

      const success = await this.updateProductStock(productId, currentStock - quantity);
      if (success) {
        console.log(`[Supabase] Stock reducido: ${productId} de ${currentStock} a ${currentStock - quantity}`);
      }
      return success;
    } catch (error) {
      console.error('Error in reduceProductStock:', error);
      return false;
    }
  },

  // Aumentar stock de un producto en Supabase (para cancelaciones)
  async increaseProductStock(productId: string, quantity: number): Promise<boolean> {
    try {
      const currentStock = await this.getProductStock(productId);
      
      // Si el producto no existe en Supabase (null), retornar false sin error
      if (currentStock === null) {
        return false; // Producto no está en Supabase
      }
      
      const success = await this.updateProductStock(productId, currentStock + quantity);
      if (success) {
        console.log(`[Supabase] Stock aumentado: ${productId} de ${currentStock} a ${currentStock + quantity}`);
      }
      return success;
    } catch (error) {
      console.error('Error in increaseProductStock:', error);
      return false;
    }
  },

  // Sincronizar stock de productos locales con Supabase
  async syncLocalProductsStock(localProducts: Array<{ id: string; name: string; stock: number }>): Promise<void> {
    if (!isSupabaseAvailable() || !supabase) {
      console.warn('Supabase no disponible para sincronización');
      return;
    }

    try {
      for (const product of localProducts) {
        // Verificar si el producto existe en Supabase por nombre
        const { data: existing } = await supabase
          .from('products')
          .select('id, stock')
          .ilike('name', product.name)
          .limit(1)
          .single();

        if (!existing) {
          // Si no existe, no hacer nada (el producto es solo local)
          continue;
        }
        
        // El producto existe en Supabase, no sobrescribir su stock
        console.log(`Producto ${product.name} encontrado en Supabase con stock: ${existing.stock}`);
      }
    } catch (error) {
      console.error('Error sincronizando stock:', error);
    }
  },
};
