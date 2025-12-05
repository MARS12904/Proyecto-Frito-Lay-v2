import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { PaymentMethod, DeliveryAddress } from '../data/userStorage';
import { Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
// Usar la API legacy de expo-file-system para SDK 54+
import * as FileSystem from 'expo-file-system/legacy';

// Función para validar si un string es un UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Función helper para leer archivo como base64 en React Native
const readFileAsBase64 = async (uri: string): Promise<string> => {
  const result = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return result;
};

export const userProfileService = {
  // Subir imagen de perfil a Supabase Storage
  async uploadProfileImage(userId: string, imageUri: string): Promise<string | null> {
    if (!isValidUUID(userId)) {
      console.warn('userId no es un UUID válido, no se puede subir imagen');
      return null;
    }

    if (!isSupabaseAvailable() || !supabase) {
      console.warn('Supabase no está disponible');
      return null;
    }

    try {
      // Determinar la extensión del archivo
      const uriParts = imageUri.split('.');
      const fileExt = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
      const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) ? fileExt : 'jpg';
      const contentType = `image/${validExt === 'jpg' ? 'jpeg' : validExt}`;
      
      const fileName = `${userId}_${Date.now()}.${validExt}`;
      const filePath = `profile-images/${fileName}`;

      let uploadData: ArrayBuffer | Blob;

      if (Platform.OS === 'web') {
        // En web, usar fetch y blob
        const response = await fetch(imageUri);
        uploadData = await response.blob();
      } else {
        // En React Native, leer el archivo como base64 y convertir a ArrayBuffer
        const base64 = await readFileAsBase64(imageUri);
        uploadData = decode(base64);
      }

      // Eliminar imagen anterior si existe
      try {
        const { data: oldImages } = await supabase.storage
          .from('avatars')
          .list('profile-images', {
            search: userId
          });

        if (oldImages && oldImages.length > 0) {
          const filesToDelete = oldImages
            .filter(file => file.name.startsWith(userId))
            .map(file => `profile-images/${file.name}`);
          
          if (filesToDelete.length > 0) {
            await supabase.storage.from('avatars').remove(filesToDelete);
          }
        }
      } catch (listError) {
        console.log('No se pudieron listar imágenes anteriores:', listError);
        // Continuar aunque falle la eliminación de imágenes anteriores
      }

      // Subir nueva imagen
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, uploadData, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('Error uploading image:', error);
        return null;
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Actualizar el perfil del usuario con la nueva URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          profile_image_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile with image URL:', updateError);
        return null;
      }

      console.log('Imagen de perfil subida exitosamente:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error in uploadProfileImage:', error);
      return null;
    }
  },

  // Eliminar imagen de perfil
  async deleteProfileImage(userId: string): Promise<boolean> {
    if (!isValidUUID(userId)) {
      return false;
    }

    if (!isSupabaseAvailable() || !supabase) {
      return false;
    }

    try {
      // Buscar y eliminar imágenes del usuario
      const { data: images } = await supabase.storage
        .from('avatars')
        .list('profile-images', {
          search: userId
        });

      if (images && images.length > 0) {
        const filesToDelete = images
          .filter(file => file.name.startsWith(userId))
          .map(file => `profile-images/${file.name}`);

        if (filesToDelete.length > 0) {
          await supabase.storage.from('avatars').remove(filesToDelete);
        }
      }

      // Actualizar perfil para quitar la URL
      await supabase
        .from('user_profiles')
        .update({
          profile_image_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return true;
    } catch (error) {
      console.error('Error in deleteProfileImage:', error);
      return false;
    }
  },
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

