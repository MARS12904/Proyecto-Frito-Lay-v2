import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { PaymentMethod, DeliveryAddress } from '../data/userStorage';

// Función para validar si un string es un UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const userProfileService = {
  // Guardar métodos de pago del usuario en Supabase
  async savePaymentMethods(userId: string, paymentMethods: PaymentMethod[]): Promise<boolean> {
    // Si el userId no es un UUID válido, no intentar guardar en Supabase
    if (!isValidUUID(userId)) {
      console.warn('userId no es un UUID válido, no se puede guardar en Supabase (modo local)');
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede guardar métodos de pago');
      return false;
    }

    try {
      if (!supabase) return false;

      // Actualizar el perfil del usuario con los métodos de pago
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ 
          payment_methods: paymentMethods,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Error saving payment methods:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return false;
      }

      if (data && data.length > 0) {
        console.log('Métodos de pago guardados exitosamente en Supabase:', data[0].payment_methods?.length || 0, 'métodos');
        return true;
      }

      console.warn('No se encontró el perfil para actualizar métodos de pago');
      return false;
    } catch (error) {
      console.error('Error in savePaymentMethods:', error);
      return false;
    }
  },

  // Guardar direcciones de entrega del usuario en Supabase
  async saveDeliveryAddresses(userId: string, deliveryAddresses: DeliveryAddress[]): Promise<boolean> {
    // Si el userId no es un UUID válido, no intentar guardar en Supabase
    if (!isValidUUID(userId)) {
      console.warn('userId no es un UUID válido, no se puede guardar en Supabase (modo local)');
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede guardar direcciones de entrega');
      return false;
    }

    try {
      if (!supabase) return false;

      // Actualizar el perfil del usuario con las direcciones de entrega
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ 
          delivery_addresses: deliveryAddresses,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Error saving delivery addresses:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return false;
      }

      if (data && data.length > 0) {
        console.log('Direcciones guardadas exitosamente en Supabase:', data[0].delivery_addresses?.length || 0, 'direcciones');
        return true;
      }

      console.warn('No se encontró el perfil para actualizar direcciones');
      return false;
    } catch (error) {
      console.error('Error in saveDeliveryAddresses:', error);
      return false;
    }
  },

  // Obtener métodos de pago del usuario desde Supabase
  async getPaymentMethods(userId: string): Promise<PaymentMethod[] | null> {
    if (!isValidUUID(userId)) {
      return null;
    }

    if (!isSupabaseAvailable()) {
      return null;
    }

    try {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('payment_methods')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching payment methods:', error);
        return null;
      }

      return data?.payment_methods || null;
    } catch (error) {
      console.error('Error in getPaymentMethods:', error);
      return null;
    }
  },

  // Obtener direcciones de entrega del usuario desde Supabase
  async getDeliveryAddresses(userId: string): Promise<DeliveryAddress[] | null> {
    if (!isValidUUID(userId)) {
      return null;
    }

    if (!isSupabaseAvailable()) {
      return null;
    }

    try {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('delivery_addresses')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching delivery addresses:', error);
        return null;
      }

      return data?.delivery_addresses || null;
    } catch (error) {
      console.error('Error in getDeliveryAddresses:', error);
      return null;
    }
  },
};

