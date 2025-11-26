import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { DeliveryAddress } from '../data/userStorage';

// Función para validar si un string es un UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const deliveryAddressesService = {
  // Obtener todas las direcciones de un usuario desde la tabla delivery_addresses
  async getAddresses(userId: string): Promise<DeliveryAddress[]> {
    if (!isValidUUID(userId)) {
      console.warn('userId no es un UUID válido, retornando lista vacía (modo local)');
      return [];
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, retornando lista vacía de direcciones');
      return [];
    }

    try {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery addresses:', error);
        return [];
      }

      // Transformar de formato de tabla a formato DeliveryAddress
      return (data || []).map((addr: any) => ({
        id: addr.id,
        address: addr.address,
        zone: addr.zone,
        notes: addr.reference,
        isDefault: addr.is_default || false,
      }));
    } catch (error) {
      console.error('Error in getAddresses:', error);
      return [];
    }
  },

  // Guardar una dirección en la tabla delivery_addresses
  async saveAddress(userId: string, address: Omit<DeliveryAddress, 'id'>): Promise<string | null> {
    console.log('[deliveryAddressesService] saveAddress iniciado', {
      userId,
      userIdIsValid: isValidUUID(userId),
      zone: address.zone,
      addressLength: address.address.length,
    });

    if (!isValidUUID(userId)) {
      console.warn('[deliveryAddressesService] userId no es un UUID válido, no se puede guardar en Supabase (modo local)');
      return null;
    }

    if (!isSupabaseAvailable()) {
      console.warn('[deliveryAddressesService] Supabase no está disponible, no se puede guardar la dirección');
      return null;
    }

    try {
      if (!supabase) {
        console.error('[deliveryAddressesService] Cliente de Supabase es null');
        return null;
      }

      console.log('[deliveryAddressesService] Preparando datos para insertar...');

      // Si se marca como default, desmarcar las demás
      if (address.isDefault) {
        console.log('[deliveryAddressesService] Desmarcando otras direcciones como default...');
        const { error: updateError } = await supabase
          .from('delivery_addresses')
          .update({ is_default: false })
          .eq('user_id', userId);
        
        if (updateError) {
          console.warn('[deliveryAddressesService] Error al desmarcar direcciones default (continuando):', updateError);
        }
      }

      const insertData = {
        user_id: userId,
        label: address.address.substring(0, 100), // Usar parte de la dirección como label
        zone: address.zone || null,
        address: address.address,
        reference: address.notes || null,
        is_default: address.isDefault || false,
      };

      console.log('[deliveryAddressesService] Insertando en Supabase...', {
        table: 'delivery_addresses',
        data: { ...insertData, address: insertData.address.substring(0, 50) + '...' },
      });

      const { data, error } = await supabase
        .from('delivery_addresses')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[deliveryAddressesService] ❌ Error saving delivery address:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: (error as any).status,
        });
        console.error('[deliveryAddressesService] Datos que se intentaron insertar:', insertData);
        return null;
      }

      if (data) {
        console.log('[deliveryAddressesService] ✅ Dirección guardada exitosamente en Supabase:', data.id);
        return data.id;
      }

      console.error('[deliveryAddressesService] ❌ No se retornó data ni error, retornando null');
      return null;
    } catch (error) {
      console.error('[deliveryAddressesService] ❌ Error inesperado en saveAddress:', error);
      if (error instanceof Error) {
        console.error('[deliveryAddressesService] Error message:', error.message);
        console.error('[deliveryAddressesService] Error stack:', error.stack);
      }
      return null;
    }
  },

  // Actualizar una dirección existente
  async updateAddress(userId: string, addressId: string, address: Partial<DeliveryAddress>): Promise<boolean> {
    if (!isValidUUID(userId) || !isValidUUID(addressId)) {
      console.warn('userId o addressId no son UUIDs válidos, no se puede actualizar en Supabase (modo local)');
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede actualizar la dirección');
      return false;
    }

    try {
      if (!supabase) return false;

      // Si se marca como default, desmarcar las demás
      if (address.isDefault) {
        await supabase
          .from('delivery_addresses')
          .update({ is_default: false })
          .eq('user_id', userId)
          .neq('id', addressId);
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (address.address !== undefined) {
        updateData.address = address.address;
        updateData.label = address.address.substring(0, 100);
      }
      if (address.zone !== undefined) updateData.zone = address.zone;
      if (address.notes !== undefined) updateData.reference = address.notes;
      if (address.isDefault !== undefined) updateData.is_default = address.isDefault;

      const { error } = await supabase
        .from('delivery_addresses')
        .update(updateData)
        .eq('id', addressId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating delivery address:', error);
        return false;
      }

      console.log('Dirección actualizada exitosamente en Supabase');
      return true;
    } catch (error) {
      console.error('Error in updateAddress:', error);
      return false;
    }
  },

  // Eliminar una dirección
  async deleteAddress(userId: string, addressId: string): Promise<boolean> {
    if (!isValidUUID(userId) || !isValidUUID(addressId)) {
      console.warn('userId o addressId no son UUIDs válidos, no se puede eliminar en Supabase (modo local)');
      return false;
    }

    if (!isSupabaseAvailable()) {
      console.warn('Supabase no está disponible, no se puede eliminar la dirección');
      return false;
    }

    try {
      if (!supabase) return false;

      const { error } = await supabase
        .from('delivery_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting delivery address:', error);
        return false;
      }

      console.log('Dirección eliminada exitosamente de Supabase');
      return true;
    } catch (error) {
      console.error('Error in deleteAddress:', error);
      return false;
    }
  },

  // Sincronizar direcciones desde JSONB a tabla (migración)
  async syncFromJSONB(userId: string, addresses: DeliveryAddress[]): Promise<boolean> {
    if (!isValidUUID(userId)) {
      return false;
    }

    if (!isSupabaseAvailable() || !supabase) {
      return false;
    }

    try {
      // Obtener direcciones existentes en la tabla
      const existingAddresses = await this.getAddresses(userId);

      // Crear un mapa de direcciones existentes por address (para evitar duplicados)
      const existingMap = new Map(
        existingAddresses.map(addr => [addr.address.toLowerCase().trim(), addr])
      );

      // Insertar solo las direcciones que no existen
      for (const address of addresses) {
        const key = address.address.toLowerCase().trim();
        if (!existingMap.has(key)) {
          await this.saveAddress(userId, address);
        }
      }

      console.log('Direcciones sincronizadas desde JSONB a tabla');
      return true;
    } catch (error) {
      console.error('Error syncing addresses:', error);
      return false;
    }
  },
};

