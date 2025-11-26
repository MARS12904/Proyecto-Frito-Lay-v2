import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Obtener las variables de entorno
let supabaseUrl: string | undefined = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
let supabaseAnonKey: string | undefined = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Limpiar y normalizar los valores (eliminar espacios, saltos de línea, etc.)
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '');
  if (supabaseUrl === '') supabaseUrl = undefined;
}

if (supabaseAnonKey) {
  supabaseAnonKey = supabaseAnonKey.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '');
  if (supabaseAnonKey === '') supabaseAnonKey = undefined;
}

// Validar que las URLs no sean placeholders o valores inválidos
if (supabaseUrl && (
  supabaseUrl.includes('TU_SUPABASE') || 
  supabaseUrl.includes('AQUI') ||
  supabaseUrl === 'undefined' ||
  supabaseUrl === 'null'
)) {
  supabaseUrl = undefined;
}

if (supabaseAnonKey && (
  supabaseAnonKey.includes('TU_SUPABASE') || 
  supabaseAnonKey.includes('AQUI') ||
  supabaseAnonKey === 'undefined' ||
  supabaseAnonKey === 'null'
)) {
  supabaseAnonKey = undefined;
}

// Validar formato de URL de manera estricta
const isValidUrl = (url: string | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  const trimmedUrl = url.trim();
  if (trimmedUrl === '') return false;
  
  try {
    const urlObj = new URL(trimmedUrl);
    const isValidProtocol = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    const hasHost = urlObj.hostname && urlObj.hostname.length > 0;
    return isValidProtocol && hasHost;
  } catch {
    return false;
  }
};

// Verificar que ambas variables estén presentes y sean válidas
const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  isValidUrl(supabaseUrl) &&
  supabaseAnonKey.trim().length > 0;

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase no está configurado correctamente.\n' +
    'Por favor, configura las variables en app.json:\n' +
    '  "extra": {\n' +
    '    "supabaseUrl": "https://tu-proyecto.supabase.co",\n' +
    '    "supabaseAnonKey": "tu-anon-key"\n' +
    '  }\n' +
    '\nLa app funcionará en modo local (AsyncStorage) hasta que configures Supabase.'
  );
}

// Storage adapter para React Native usando AsyncStorage
const AsyncStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in AsyncStorage:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from AsyncStorage:', error);
    }
  },
};

// Crear cliente de Supabase solo si está configurado correctamente
// IMPORTANTE: No crear el cliente si la configuración no es válida para evitar errores
let supabaseClient: ReturnType<typeof createClient> | null = null;

if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
  try {
    // Validación final antes de crear el cliente
    if (isValidUrl(supabaseUrl) && supabaseAnonKey.trim().length > 0) {
      supabaseClient = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
        auth: {
          storage: AsyncStorageAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
    }
  } catch (error) {
    console.error('Error creando cliente de Supabase:', error);
    supabaseClient = null;
  }
}

export const supabase = supabaseClient;

// Exportar flag para verificar si Supabase está disponible
export const isSupabaseAvailable = () => supabase !== null;
