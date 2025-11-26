import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { PaymentMethod } from '../data/userStorage';

// Función para validar si un string es un UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const paymentMethodsService = {
  // Obtener todos los métodos de pago de un usuario desde la tabla payment_methods
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    if (!isValidUUID(userId)) {
      console.warn('userId no es un UUID válido, retornando lista vacía (modo local)');
      return [];
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, retornando lista vacía de métodos de pago');
      return [];
    }

    try {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment methods:', error);
        return [];
      }

      // Transformar de formato de tabla a formato PaymentMethod
      return (data || []).map((method: any) => ({
        id: method.id,
        type: method.type as 'card' | 'transfer' | 'cash' | 'credit',
        name: method.name,
        details: method.type === 'card'
          ? {
              cardNumber: method.card_number,
              expiryDate: method.expiry_date,
            }
          : method.type === 'transfer'
          ? {
              bank: method.bank,
              accountNumber: method.account_number,
            }
          : undefined,
        isDefault: method.is_default || false,
      }));
    } catch (error) {
      console.error('Error in getPaymentMethods:', error);
      return [];
    }
  },

  // Guardar un método de pago en la tabla payment_methods
  async savePaymentMethod(userId: string, method: Omit<PaymentMethod, 'id'>): Promise<string | null> {
    console.log('[paymentMethodsService] savePaymentMethod iniciado', {
      userId,
      userIdIsValid: isValidUUID(userId),
      methodType: method.type,
      methodName: method.name,
    });

    if (!isValidUUID(userId)) {
      console.warn('[paymentMethodsService] userId no es un UUID válido, no se puede guardar en Supabase (modo local)');
      return null;
    }

    if (!isSupabaseAvailable()) {
      console.warn('[paymentMethodsService] Supabase no está disponible, no se puede guardar el método de pago');
      return null;
    }

    try {
      if (!supabase) {
        console.error('[paymentMethodsService] Cliente de Supabase es null');
        return null;
      }

      console.log('[paymentMethodsService] Preparando datos para insertar...');

      // Si se marca como default, desmarcar los demás
      if (method.isDefault) {
        console.log('[paymentMethodsService] Desmarcando otros métodos como default...');
        const updateQuery: any = supabase.from('payment_methods');
        const { error: updateError } = await updateQuery
          .update({ is_default: false })
          .eq('user_id', userId);
        
        if (updateError) {
          console.warn('[paymentMethodsService] Error al desmarcar métodos default (continuando):', updateError);
        }
      }

      const insertData: any = {
        user_id: userId,
        type: method.type,
        name: method.name,
        is_default: method.isDefault || false,
      };

      // Agregar campos según el tipo (SOLO los campos que existen en nuestra tabla)
      if (method.type === 'card' && method.details) {
        insertData.card_number = method.details.cardNumber;
        insertData.expiry_date = method.details.expiryDate;
        console.log('[paymentMethodsService] Método tipo tarjeta, agregando datos de tarjeta');
      } else if (method.type === 'transfer' && method.details) {
        insertData.bank = method.details.bank;
        insertData.account_number = method.details.accountNumber;
        console.log('[paymentMethodsService] Método tipo transferencia, agregando datos bancarios');
      } else if (method.type === 'cash' || method.type === 'credit') {
        console.log('[paymentMethodsService] Método tipo', method.type, '(sin detalles adicionales)');
      }

      console.log('[paymentMethodsService] Insertando en Supabase...', {
        table: 'payment_methods',
        data: { ...insertData, card_number: insertData.card_number ? '***' : undefined, account_number: insertData.account_number ? '***' : undefined },
      });

      const insertQuery: any = supabase.from('payment_methods');
      const { data, error } = await insertQuery
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[paymentMethodsService] ❌ Error saving payment method:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: (error as any).status,
        });
        console.error('[paymentMethodsService] Datos que se intentaron insertar:', insertData);
        return null;
      }

      if (data) {
        console.log('[paymentMethodsService] ✅ Método de pago guardado exitosamente en Supabase:', data.id);
        return data.id;
      }

      console.error('[paymentMethodsService] ❌ No se retornó data ni error, retornando null');
      return null;
    } catch (error) {
      console.error('[paymentMethodsService] ❌ Error inesperado en savePaymentMethod:', error);
      if (error instanceof Error) {
        console.error('[paymentMethodsService] Error message:', error.message);
        console.error('[paymentMethodsService] Error stack:', error.stack);
      }
      return null;
    }
  },

  // Actualizar un método de pago existente
  async updatePaymentMethod(userId: string, methodId: string, method: Partial<PaymentMethod>): Promise<boolean> {
    if (!isValidUUID(userId) || !isValidUUID(methodId)) {
      console.warn('userId o methodId no son UUIDs válidos, no se puede actualizar en Supabase (modo local)');
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede actualizar el método de pago');
      return false;
    }

    try {
      if (!supabase) return false;

      // Si se marca como default, desmarcar los demás
      if (method.isDefault) {
        const updateQuery: any = supabase.from('payment_methods');
        await updateQuery
          .update({ is_default: false })
          .eq('user_id', userId)
          .neq('id', methodId);
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (method.type !== undefined) updateData.type = method.type;
      if (method.name !== undefined) {
        updateData.name = method.name;
        // NOTA: La columna 'brand' no existe en la tabla, no intentar actualizarla
      }
      if (method.isDefault !== undefined) updateData.is_default = method.isDefault;

      // Actualizar detalles según el tipo
      if (method.type === 'card' && method.details) {
        if (method.details.cardNumber !== undefined) updateData.card_number = method.details.cardNumber;
        if (method.details.expiryDate !== undefined) updateData.expiry_date = method.details.expiryDate;
      } else if (method.type === 'transfer' && method.details) {
        if (method.details.bank !== undefined) updateData.bank = method.details.bank;
        if (method.details.accountNumber !== undefined) updateData.account_number = method.details.accountNumber;
      }

      const updateQuery: any = supabase.from('payment_methods');
      const { error } = await updateQuery
        .update(updateData)
        .eq('id', methodId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating payment method:', error);
        return false;
      }

      console.log('Método de pago actualizado exitosamente en Supabase');
      return true;
    } catch (error) {
      console.error('Error in updatePaymentMethod:', error);
      return false;
    }
  },

  // Eliminar un método de pago
  async deletePaymentMethod(userId: string, methodId: string): Promise<boolean> {
    if (!isValidUUID(userId) || !isValidUUID(methodId)) {
      console.warn('userId o methodId no son UUIDs válidos, no se puede eliminar en Supabase (modo local)');
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede eliminar el método de pago');
      return false;
    }

    try {
      if (!supabase) return false;

      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting payment method:', error);
        return false;
      }

      console.log('Método de pago eliminado exitosamente de Supabase');
      return true;
    } catch (error) {
      console.error('Error in deletePaymentMethod:', error);
      return false;
    }
  },

  // Sincronizar métodos de pago desde JSONB a tabla (migración)
  async syncFromJSONB(userId: string, methods: PaymentMethod[]): Promise<boolean> {
    if (!isValidUUID(userId)) {
      return false;
    }

    if (!isSupabaseAvailable() || !supabase) {
      return false;
    }

    try {
      // Obtener métodos existentes en la tabla
      const existingMethods = await this.getPaymentMethods(userId);

      // Crear un mapa de métodos existentes por nombre (para evitar duplicados)
      const existingMap = new Map(
        existingMethods.map(m => [m.name.toLowerCase().trim(), m])
      );

      // Insertar solo los métodos que no existen
      for (const method of methods) {
        const key = method.name.toLowerCase().trim();
        if (!existingMap.has(key)) {
          await this.savePaymentMethod(userId, method);
        }
      }

      console.log('Métodos de pago sincronizados desde JSONB a tabla');
      return true;
    } catch (error) {
      console.error('Error syncing payment methods:', error);
      return false;
    }
  },
};

