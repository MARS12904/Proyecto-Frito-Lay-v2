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
    try {
      const { paymentMethodsService } = await import('./paymentMethodsService');
      return await paymentMethodsService.syncFromJSONB(userId, paymentMethods);
    } catch (error) {
      console.error('Error in savePaymentMethods delegation:', error);
      return false;
    }
  },

  // Guardar direcciones de entrega del usuario en Supabase
  async saveDeliveryAddresses(userId: string, deliveryAddresses: DeliveryAddress[]): Promise<boolean> {
    try {
      const { deliveryAddressesService } = await import('./deliveryAddressesService');
      return await deliveryAddressesService.syncFromJSONB(userId, deliveryAddresses);
    } catch (error) {
      console.error('Error in saveDeliveryAddresses delegation:', error);
      return false;
    }
  },

  // Obtener métodos de pago del usuario desde Supabase
  async getPaymentMethods(userId: string): Promise<PaymentMethod[] | null> {
    try {
      const { paymentMethodsService } = await import('./paymentMethodsService');
      return await paymentMethodsService.getPaymentMethods(userId);
    } catch (error) {
      console.error('Error in getPaymentMethods delegation:', error);
      return null;
    }
  },

  // Obtener direcciones de entrega del usuario desde Supabase
  async getDeliveryAddresses(userId: string): Promise<DeliveryAddress[] | null> {
    try {
      const { deliveryAddressesService } = await import('./deliveryAddressesService');
      return await deliveryAddressesService.getAddresses(userId);
    } catch (error) {
      console.error('Error in getDeliveryAddresses delegation:', error);
      return null;
    }
  },
};


