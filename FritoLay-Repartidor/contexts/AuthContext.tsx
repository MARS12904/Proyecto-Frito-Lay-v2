import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase, isSupabaseAvailable } from '../lib/supabase';

interface RepartidorProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  profile_image_url?: string;
  role: 'repartidor';
  license_number?: string;
  is_active: boolean;
  created_at?: string;
}

interface AuthContextType {
  user: RepartidorProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

// Helper functions para almacenamiento seguro
const setSecureItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(`secure_${key}`, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getSecureItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(`secure_${key}`);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const deleteSecureItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(`secure_${key}`);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RepartidorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      if (isSupabaseAvailable() && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Supabase no está disponible');
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        throw error;
      }

      // Verificar que el usuario tenga rol de repartidor
      if (profile.role !== 'repartidor') {
        throw new Error('Este usuario no es un repartidor');
      }

      // Verificar que esté activo
      if (!profile.is_active) {
        throw new Error('Tu cuenta está desactivada');
      }

      setUser(profile as RepartidorProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      if (!isSupabaseAvailable() || !supabase) {
        throw new Error('Supabase no está configurado');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        return false;
      }

      if (!authData.user) {
        return false;
      }

      // Cargar perfil y verificar rol
      await loadUserProfile(authData.user.id);

      // Guardar token
      if (authData.session?.access_token) {
        await setSecureItem('authToken', authData.session.access_token);
      }

      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseAvailable() && supabase) {
        await supabase.auth.signOut();
      }
      await deleteSecureItem('authToken');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};



