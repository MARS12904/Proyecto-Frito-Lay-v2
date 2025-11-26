import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { Product } from '../data/products';

// Función para validar si un string es un UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DeliverySchedule {
  id: string;
  date: string;
  timeSlot: string;
  address: string;
  notes?: string;
}

export interface UserCart {
  id?: string;
  user_id: string;
  items: CartItem[];
  is_wholesale_mode: boolean;
  delivery_schedule?: DeliverySchedule;
  updated_at?: string;
}

// Tipo para la fila de la base de datos
interface UserCartRow {
  id: string;
  user_id: string;
  items: CartItem[];
  is_wholesale_mode: boolean;
  delivery_schedule?: DeliverySchedule | null;
  updated_at: string;
  created_at?: string;
}

export const cartService = {
  // Obtener carrito del usuario
  async getCart(userId: string): Promise<UserCart | null> {
    // Validar que el userId sea un UUID válido (Supabase requiere UUIDs)
    if (!isValidUUID(userId)) {
      console.warn('userId no es un UUID válido, retornando carrito vacío (modo local)');
      return {
        user_id: userId,
        items: [],
        is_wholesale_mode: true,
      };
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, retornando carrito vacío');
      return {
        user_id: userId,
        items: [],
        is_wholesale_mode: true,
      };
    }
    
    try {
      if (!supabase) return null;
      
      const { data, error } = await (supabase as any)
        .from('user_carts')
        .select('*')
        .eq('user_id', userId)
        .single() as { data: UserCartRow | null; error: any };

      // PGRST116 = no rows returned (normal, carrito no existe aún)
      // PGRST205 = tabla no existe en el schema cache
      if (error) {
        if (error.code === 'PGRST116') {
          // Carrito no existe, retornar carrito vacío
          return {
            user_id: userId,
            items: [],
            is_wholesale_mode: true,
          };
        } else if (error.code === 'PGRST205') {
          // Tabla no existe, retornar carrito vacío (modo local)
          console.warn('Tabla user_carts no existe en Supabase. Usando modo local. Ejecuta el script SQL para crear la tabla.');
          return {
            user_id: userId,
            items: [],
            is_wholesale_mode: true,
          };
        } else {
          // Otro error
          console.error('Error fetching cart:', error);
          return {
            user_id: userId,
            items: [],
            is_wholesale_mode: true,
          };
        }
      }

      if (!data) {
        // Crear carrito vacío si no existe
        return {
          user_id: userId,
          items: [],
          is_wholesale_mode: true,
        };
      }

      return {
        id: data.id,
        user_id: data.user_id,
        items: data.items || [],
        is_wholesale_mode: data.is_wholesale_mode ?? true,
        delivery_schedule: data.delivery_schedule || undefined,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('Error in getCart:', error);
      return null;
    }
  },

  // Guardar carrito del usuario
  async saveCart(cart: UserCart): Promise<boolean> {
    // Validar que el userId sea un UUID válido
    if (!isValidUUID(cart.user_id)) {
      console.warn('userId no es un UUID válido, no se puede guardar el carrito en Supabase (modo local)');
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede guardar el carrito');
      return false;
    }
    
    try {
      if (!supabase) return false;
      
      const cartData: Partial<UserCartRow> = {
        user_id: cart.user_id,
        items: cart.items,
        is_wholesale_mode: cart.is_wholesale_mode,
        delivery_schedule: cart.delivery_schedule || null,
        updated_at: new Date().toISOString(),
      };

      // Primero verificar si ya existe un carrito para este usuario
      const { data: existingCart, error: fetchError } = await (supabase as any)
        .from('user_carts')
        .select('id')
        .eq('user_id', cart.user_id)
        .maybeSingle() as { data: { id: string } | null; error: any };

      if (fetchError && fetchError.code !== 'PGRST116' && fetchError.code !== 'PGRST205') {
        console.error('Error checking existing cart:', fetchError);
        return false;
      }

      if (existingCart || cart.id) {
        // Actualizar carrito existente
        const cartId = cart.id || existingCart?.id;
        const { error } = await (supabase as any)
          .from('user_carts')
          .update(cartData)
          .eq('id', cartId);

        if (error) {
          // Si la tabla no existe, retornar false pero no es crítico
          if (error.code === 'PGRST205') {
            console.warn('Tabla user_carts no existe. No se puede guardar en Supabase. Ejecuta el script SQL para crear la tabla.');
          } else {
            console.error('Error updating cart:', error);
          }
          return false;
        }
      } else {
        // Crear nuevo carrito solo si no existe
        const { error } = await (supabase as any)
          .from('user_carts')
          .insert(cartData);

        if (error) {
          // Si la tabla no existe, retornar false pero no es crítico
          if (error.code === 'PGRST205') {
            console.warn('Tabla user_carts no existe. No se puede guardar en Supabase. Ejecuta el script SQL para crear la tabla.');
          } else if (error.code === '23505') {
            // Violación de restricción única - el carrito ya existe, intentar actualizar
            console.warn('Carrito ya existe para este usuario, intentando actualizar...');
            const { error: updateError } = await (supabase as any)
              .from('user_carts')
              .update(cartData)
              .eq('user_id', cart.user_id);
            
            if (updateError) {
              console.error('Error updating existing cart:', updateError);
              return false;
            }
            return true;
          } else {
            console.error('Error creating cart:', error);
          }
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in saveCart:', error);
      return false;
    }
  },

  // Limpiar carrito
  async clearCart(userId: string): Promise<boolean> {
    // Validar que el userId sea un UUID válido
    if (!isValidUUID(userId)) {
      console.warn('userId no es un UUID válido, no se puede limpiar el carrito en Supabase (modo local)');
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede limpiar el carrito');
      return false;
    }
    
    try {
      if (!supabase) return false;
      
      const { error } = await (supabase as any)
        .from('user_carts')
        .delete()
        .eq('user_id', userId);

      if (error) {
        // Si la tabla no existe, retornar false pero no es crítico
        if (error.code === 'PGRST205') {
          console.warn('Tabla user_carts no existe. No se puede limpiar en Supabase. Ejecuta el script SQL para crear la tabla.');
        } else {
          console.error('Error clearing cart:', error);
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in clearCart:', error);
      return false;
    }
  },
};

