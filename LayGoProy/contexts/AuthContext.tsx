import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { seedTestUsers } from '../data/seedUsers';
import { UserStorage } from '../data/userStorage';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  profileImage?: string;
  preferences?: {
    notifications: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  paymentMethods?: {
    id: string;
    type: 'card' | 'transfer' | 'cash' | 'credit';
    name: string;
    details?: {
      cardNumber?: string;
      expiryDate?: string;
      bank?: string;
      accountNumber?: string;
    };
    isDefault?: boolean;
  }[];
  deliveryAddresses?: {
    id: string;
    address: string;
    zone?: string;
    notes?: string;
    isDefault?: boolean;
  }[];
  createdAt?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<boolean>;
  biometricLogin: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

// Helper functions para manejar almacenamiento seguro en web y móvil
const setSecureItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    // En web, usar localStorage con prefijo
    localStorage.setItem(`secure_${key}`, value);
  } else {
    // En móvil, usar SecureStore
    await SecureStore.setItemAsync(key, value);
  }
};

const getSecureItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    // En web, usar localStorage con prefijo
    return localStorage.getItem(`secure_${key}`);
  } else {
    // En móvil, usar SecureStore
    return await SecureStore.getItemAsync(key);
  }
};

const deleteSecureItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    // En web, usar localStorage con prefijo
    localStorage.removeItem(`secure_${key}`);
  } else {
    // En móvil, usar SecureStore
    await SecureStore.deleteItemAsync(key);
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeAuth = async () => {
    try {
      // Crear usuarios de prueba si no existen
      await seedTestUsers();
      
      // Verificar estado de autenticación
      await checkAuthState();
    } catch (error) {
      console.error('Error initializing auth:', error);
      setIsLoading(false);
    }
  };

  const checkAuthState = async () => {
    try {
      // Verificar sesión de Supabase primero
      const { supabase, isSupabaseAvailable } = await import('../lib/supabase');
      
      if (isSupabaseAvailable() && supabase) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (!sessionError && session?.user) {
            // Obtener perfil del usuario (usar 'as any' para evitar errores de tipos de Supabase)
            const { data: profile, error: profileError } = await (supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single() as any);

            if (!profileError && profile) {
              // Cargar direcciones desde la tabla delivery_addresses si el usuario tiene UUID válido
              let deliveryAddresses: User['deliveryAddresses'] = [];
              try {
                const { deliveryAddressesService } = await import('../services/deliveryAddressesService');
                const addressesFromTable = await deliveryAddressesService.getAddresses(profile.id);
                if (addressesFromTable.length > 0) {
                  deliveryAddresses = addressesFromTable;
                } else if (profile.delivery_addresses && Array.isArray(profile.delivery_addresses)) {
                  // Si hay direcciones en JSONB pero no en la tabla, sincronizar
                  await deliveryAddressesService.syncFromJSONB(profile.id, profile.delivery_addresses);
                  deliveryAddresses = await deliveryAddressesService.getAddresses(profile.id);
                } else {
                  deliveryAddresses = profile.delivery_addresses || [];
                }
              } catch (error) {
                console.error('Error loading delivery addresses:', error);
                deliveryAddresses = profile.delivery_addresses || [];
              }

              // Cargar métodos de pago desde la tabla payment_methods si el usuario tiene UUID válido
              let paymentMethods: User['paymentMethods'] = [];
              try {
                const { paymentMethodsService } = await import('../services/paymentMethodsService');
                const methodsFromTable = await paymentMethodsService.getPaymentMethods(profile.id);
                if (methodsFromTable.length > 0) {
                  paymentMethods = methodsFromTable;
                } else if (profile.payment_methods && Array.isArray(profile.payment_methods)) {
                  // Si hay métodos en JSONB pero no en la tabla, sincronizar
                  await paymentMethodsService.syncFromJSONB(profile.id, profile.payment_methods);
                  paymentMethods = await paymentMethodsService.getPaymentMethods(profile.id);
                } else {
                  paymentMethods = profile.payment_methods || [];
                }
              } catch (error) {
                console.error('Error loading payment methods:', error);
                paymentMethods = profile.payment_methods || [];
              }

              const user: User = {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                phone: profile.phone,
                profileImage: profile.profile_image_url,
                preferences: profile.preferences || { notifications: true, theme: 'auto' },
                paymentMethods,
                deliveryAddresses,
              };

              await AsyncStorage.setItem('currentUserId', user.id);
              // También actualizar en UserStorage para mantener sincronizado (sin password)
              const storedUser = {
                ...user,
                password: '', // UserStorage requiere password, pero no lo tenemos aquí
                createdAt: profile.created_at || new Date().toISOString(),
              };
              await UserStorage.setCurrentUser(storedUser as any);
              setUser(user);
              setIsLoading(false);
              return;
            }
          }
        } catch (supabaseError) {
          console.error('Error checking Supabase auth state:', supabaseError);
        }
      }

      // Fallback a sistema local
      const token = await getSecureItem('authToken');
      const currentUser = await UserStorage.getCurrentUser();
      
      if (token && currentUser) {
        // Intentar cargar métodos de pago y direcciones desde Supabase si el usuario tiene UUID válido
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);
        
        if (isValidUUID) {
          try {
            const { userProfileService } = await import('../services/userProfileService');
            const [paymentMethods, deliveryAddresses] = await Promise.all([
              userProfileService.getPaymentMethods(currentUser.id),
              userProfileService.getDeliveryAddresses(currentUser.id),
            ]);

            // Si hay datos en Supabase, actualizar el usuario local
            if (paymentMethods !== null || deliveryAddresses !== null) {
              const updatedUser = {
                ...currentUser,
                paymentMethods: paymentMethods || currentUser.paymentMethods,
                deliveryAddresses: deliveryAddresses || currentUser.deliveryAddresses,
              };
              await UserStorage.setCurrentUser(updatedUser);
              setUser(updatedUser);
            } else {
              setUser(currentUser);
            }
          } catch (error) {
            console.error('Error loading profile data from Supabase:', error);
            setUser(currentUser);
          }
        } else {
          setUser(currentUser);
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Intentar login con Supabase primero
      const { supabase, isSupabaseAvailable } = await import('../lib/supabase');
      
      if (isSupabaseAvailable() && supabase) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password,
          });

          if (authError) {
            console.error('Supabase login error:', authError);
            // Fallback a sistema local si falla Supabase
            return await loginLocal(email, password);
          }

          if (authData?.user) {
            // Obtener perfil del usuario desde Supabase (usar 'as any' para evitar errores de tipos)
            const { data: profile, error: profileError } = await (supabase
              .from('user_profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single() as any);

            if (profileError) {
              console.error('Error fetching profile:', profileError);
              // Si no hay perfil, crear uno básico (usar 'as any' para evitar errores de tipos)
              const { data: newProfile, error: createError } = await (supabase
                .from('user_profiles')
                .insert({
                  id: authData.user.id,
                  email: authData.user.email || email,
                  name: authData.user.user_metadata?.name || email.split('@')[0],
                  role: authData.user.user_metadata?.role || 'comerciante',
                  is_active: true,
                } as any)
                .select()
                .single() as any);

              if (createError || !newProfile) {
                console.error('Error creating profile:', createError);
                return await loginLocal(email, password);
              }

              // Cargar direcciones desde la tabla delivery_addresses
              let deliveryAddresses: User['deliveryAddresses'] = [];
              try {
                const { deliveryAddressesService } = await import('../services/deliveryAddressesService');
                const addressesFromTable = await deliveryAddressesService.getAddresses(newProfile.id);
                if (addressesFromTable.length > 0) {
                  deliveryAddresses = addressesFromTable;
                } else if (newProfile.delivery_addresses && Array.isArray(newProfile.delivery_addresses)) {
                  // Si hay direcciones en JSONB pero no en la tabla, sincronizar
                  await deliveryAddressesService.syncFromJSONB(newProfile.id, newProfile.delivery_addresses);
                  deliveryAddresses = await deliveryAddressesService.getAddresses(newProfile.id);
                } else {
                  deliveryAddresses = newProfile.delivery_addresses || [];
                }
              } catch (error) {
                console.error('Error loading delivery addresses:', error);
                deliveryAddresses = newProfile.delivery_addresses || [];
              }

              // Cargar métodos de pago desde la tabla payment_methods
              let paymentMethods: User['paymentMethods'] = [];
              try {
                const { paymentMethodsService } = await import('../services/paymentMethodsService');
                const methodsFromTable = await paymentMethodsService.getPaymentMethods(newProfile.id);
                if (methodsFromTable.length > 0) {
                  paymentMethods = methodsFromTable;
                } else if (newProfile.payment_methods && Array.isArray(newProfile.payment_methods)) {
                  // Si hay métodos en JSONB pero no en la tabla, sincronizar
                  await paymentMethodsService.syncFromJSONB(newProfile.id, newProfile.payment_methods);
                  paymentMethods = await paymentMethodsService.getPaymentMethods(newProfile.id);
                } else {
                  paymentMethods = newProfile.payment_methods || [];
                }
              } catch (error) {
                console.error('Error loading payment methods:', error);
                paymentMethods = newProfile.payment_methods || [];
              }

              const user: User = {
                id: newProfile.id,
                email: newProfile.email,
                name: newProfile.name,
                phone: newProfile.phone,
                profileImage: newProfile.profile_image_url,
                preferences: newProfile.preferences || { notifications: true, theme: 'auto' },
                paymentMethods,
                deliveryAddresses,
              };

              await AsyncStorage.setItem('currentUserId', user.id);
              // También actualizar en UserStorage para mantener sincronizado (sin password)
              const storedUser = {
                ...user,
                password: '', // UserStorage requiere password, pero no lo tenemos aquí
                createdAt: newProfile.created_at || new Date().toISOString(),
              };
              await UserStorage.setCurrentUser(storedUser as any);
              setUser(user);
              return true;
            }

            // Usuario con perfil existente
            // Cargar direcciones desde la tabla delivery_addresses
            let deliveryAddresses: User['deliveryAddresses'] = [];
            try {
              const { deliveryAddressesService } = await import('../services/deliveryAddressesService');
              const addressesFromTable = await deliveryAddressesService.getAddresses(profile.id);
              if (addressesFromTable.length > 0) {
                deliveryAddresses = addressesFromTable;
              } else if (profile.delivery_addresses && Array.isArray(profile.delivery_addresses)) {
                // Si hay direcciones en JSONB pero no en la tabla, sincronizar
                await deliveryAddressesService.syncFromJSONB(profile.id, profile.delivery_addresses);
                deliveryAddresses = await deliveryAddressesService.getAddresses(profile.id);
              } else {
                deliveryAddresses = profile.delivery_addresses || [];
              }
            } catch (error) {
              console.error('Error loading delivery addresses:', error);
              deliveryAddresses = profile.delivery_addresses || [];
            }

            // Cargar métodos de pago desde la tabla payment_methods
            let paymentMethods: User['paymentMethods'] = [];
            try {
              const { paymentMethodsService } = await import('../services/paymentMethodsService');
              const methodsFromTable = await paymentMethodsService.getPaymentMethods(profile.id);
              if (methodsFromTable.length > 0) {
                paymentMethods = methodsFromTable;
              } else if (profile.payment_methods && Array.isArray(profile.payment_methods)) {
                // Si hay métodos en JSONB pero no en la tabla, sincronizar
                await paymentMethodsService.syncFromJSONB(profile.id, profile.payment_methods);
                paymentMethods = await paymentMethodsService.getPaymentMethods(profile.id);
              } else {
                paymentMethods = profile.payment_methods || [];
              }
            } catch (error) {
              console.error('Error loading payment methods:', error);
              paymentMethods = profile.payment_methods || [];
            }

            const user: User = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              phone: profile.phone,
              profileImage: profile.profile_image_url,
              preferences: profile.preferences || { notifications: true, theme: 'auto' },
              paymentMethods,
              deliveryAddresses,
            };

            await AsyncStorage.setItem('currentUserId', user.id);
            // También actualizar en UserStorage para mantener sincronizado (sin password)
            const storedUser = {
              ...user,
              password: '', // UserStorage requiere password, pero no lo tenemos aquí
              createdAt: profile.created_at || new Date().toISOString(),
            };
            await UserStorage.setCurrentUser(storedUser as any);
            setUser(user);
            return true;
          }
        } catch (supabaseError) {
          console.error('Error in Supabase login:', supabaseError);
          // Fallback a sistema local
          return await loginLocal(email, password);
        }
      }

      // Fallback a sistema local si Supabase no está disponible
      return await loginLocal(email, password);
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función auxiliar para login local (fallback)
  const loginLocal = async (email: string, password: string): Promise<boolean> => {
    try {
      const storedUser = await UserStorage.validateCredentials(email, password);
      
      if (storedUser) {
        const token = 'mock-jwt-token-' + Date.now();
        await setSecureItem('authToken', token);
        await UserStorage.setCurrentUser(storedUser);
        await AsyncStorage.setItem('currentUserId', storedUser.id);
        setUser(storedUser);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Local login error:', error);
      return false;
    }
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'> & { password: string }): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Intentar registro con Supabase primero
      const { supabase, isSupabaseAvailable } = await import('../lib/supabase');
      
      if (isSupabaseAvailable() && supabase) {
        try {
          // Registrar usuario en Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email.toLowerCase().trim(),
            password: userData.password,
            options: {
              data: {
                name: userData.name,
                role: 'comerciante',
              },
            },
          });

          if (authError) {
            console.error('Supabase registration error:', {
              message: authError.message,
              status: authError.status,
              name: authError.name,
              error: authError,
            });
            
            // Si el error es que el email ya existe, intentar login
            if (
              authError.message.includes('already registered') || 
              authError.message.includes('already exists') ||
              authError.message.includes('User already registered')
            ) {
              Alert.alert('Error', 'Este email ya está registrado. Por favor inicia sesión.');
              return false;
            }
            
            // Si es un error de base de datos, mostrar mensaje más específico
            if (authError.message.includes('Database error')) {
              Alert.alert(
                'Error de Base de Datos', 
                'Hubo un problema al crear el usuario. Por favor verifica que el trigger esté configurado correctamente en Supabase.\n\n' +
                'Error: ' + authError.message
              );
              console.error('Database error details:', authError);
              // Intentar crear el perfil manualmente si el usuario se creó
              // (esto se maneja más abajo)
            }
            
            // Fallback a sistema local si falla Supabase
            return await registerLocal(userData);
          }

          if (authData?.user) {
            console.log('Usuario creado en Supabase Auth:', authData.user.id);
            
            // El perfil se crea automáticamente por el trigger, pero verificamos
            // Esperar un momento para que el trigger se ejecute
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verificar si el perfil fue creado (intentar varias veces)
            let profile: any = null;
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts && !profile) {
              const result: any = await (supabase
                .from('user_profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single() as any);

              profile = result.data;
              // Log error si existe
              if (result.error) {
                console.warn('Error fetching profile (attempt', attempts + 1, '):', result.error);
              }

              if (profile) {
                console.log('Perfil encontrado después de', attempts + 1, 'intentos');
                break;
              }

              if (attempts < maxAttempts - 1) {
                console.log('Perfil no encontrado, esperando... (intento', attempts + 1, 'de', maxAttempts + ')');
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              attempts++;
            }

            if (!profile) {
              console.warn('El trigger no creó el perfil, creando manualmente...');
              // Si el trigger no funcionó, crear el perfil manualmente
              // Asegurarse de que el role sea exactamente 'comerciante' (sin espacios, minúsculas)
              const roleValue = 'comerciante'; // Valor exacto que cumple con el constraint
              
              const { data: newProfile, error: createError } = await (supabase
                .from('user_profiles')
                .insert({
                  id: authData.user.id,
                  email: (authData.user.email || userData.email).toLowerCase().trim(),
                  name: userData.name.trim(),
                  phone: userData.phone?.trim() || null,
                  role: roleValue, // Asegurar que sea exactamente 'comerciante'
                  is_active: true,
                  preferences: userData.preferences || { notifications: true, theme: 'auto' },
                } as any)
                .select()
                .single() as any);

              if (createError || !newProfile) {
                console.error('Error creating profile manually:', {
                  error: createError,
                  message: createError?.message,
                  details: createError?.details,
                  hint: createError?.hint,
                });
                
                Alert.alert(
                  'Error al crear perfil',
                  'El usuario se creó pero no se pudo crear el perfil. Por favor contacta al soporte.\n\n' +
                  'Error: ' + (createError?.message || 'Error desconocido')
                );
                
                // No eliminar el usuario de auth, puede ser recuperado después
                // await supabase.auth.admin?.deleteUser(authData.user.id).catch(() => {});
                return false;
              }

              profile = newProfile;
              console.log('Perfil creado manualmente exitosamente');
            }

            console.log('Usuario registrado exitosamente en Supabase:', authData.user.email);
            return true;
          }

          return false;
        } catch (supabaseError) {
          console.error('Error in Supabase registration:', supabaseError);
          // Fallback a sistema local
          return await registerLocal(userData);
        }
      }

      // Fallback a sistema local si Supabase no está disponible
      return await registerLocal(userData);
    } catch (error) {
      console.error('Register error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función auxiliar para registro local (fallback)
  const registerLocal = async (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'> & { password: string }): Promise<boolean> => {
    try {
      const newUser = await UserStorage.registerUser({
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        password: userData.password,
        profileImage: userData.profileImage,
        preferences: userData.preferences || {
          notifications: true,
          theme: 'auto'
        }
      });
      
      console.log('Usuario registrado exitosamente (local):', newUser.email);
      return true;
    } catch (error) {
      console.error('Local registration error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Cerrar sesión en Supabase si está disponible
      const { supabase, isSupabaseAvailable } = await import('../lib/supabase');
      
      if (isSupabaseAvailable() && supabase) {
        try {
          await supabase.auth.signOut();
        } catch (supabaseError) {
          console.error('Error signing out from Supabase:', supabaseError);
        }
      }

      // Cerrar sesión local
      await deleteSecureItem('authToken');
      await UserStorage.clearCurrentUser();
      // No eliminar currentUserId para mantener el carrito del usuario
      // await AsyncStorage.removeItem('currentUserId');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<boolean> => {
    try {
      if (!user) return false;
      
      // Verificar si el usuario tiene UUID válido (está en Supabase)
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      const { supabase, isSupabaseAvailable } = await import('../lib/supabase');
      
      // Si el usuario está en Supabase, actualizar primero allí
      if (isValidUUID && isSupabaseAvailable() && supabase) {
        try {
          // Preparar datos para actualizar en Supabase
          const updateData: any = {
            updated_at: new Date().toISOString(),
          };

          // Agregar campos que se están actualizando
          if (userData.name !== undefined) updateData.name = userData.name.trim();
          if (userData.phone !== undefined) updateData.phone = userData.phone?.trim() || null;
          if (userData.profileImage !== undefined) updateData.profile_image_url = userData.profileImage;
          if (userData.preferences !== undefined) updateData.preferences = userData.preferences;
          
          // NO guardar paymentMethods ni deliveryAddresses en JSONB si el usuario tiene UUID válido
          // Estos datos se manejan en sus respectivas tablas:
          // - payment_methods → tabla payment_methods
          // - delivery_addresses → tabla delivery_addresses
          // Solo guardar en JSONB si es usuario local (sin UUID válido)
          if (!isValidUUID) {
            if (userData.paymentMethods !== undefined) {
              updateData.payment_methods = userData.paymentMethods;
            }
            if (userData.deliveryAddresses !== undefined) {
              updateData.delivery_addresses = userData.deliveryAddresses;
            }
          }

          // Actualizar en Supabase (usar 'as any' para evitar errores de tipos)
          const updateResult: any = await (supabase as any)
            .from('user_profiles')
            .update(updateData)
            .eq('id', user.id);
          const supabaseError = updateResult?.error;

          if (supabaseError) {
            console.error('Error updating profile in Supabase:', supabaseError);
            // Continuar con actualización local aunque falle Supabase
          } else {
            console.log('Perfil actualizado exitosamente en Supabase');
            
            // Recargar el perfil desde Supabase para sincronizar (usar 'as any' para evitar errores de tipos)
            const { data: updatedProfile, error: fetchError } = await (supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .single() as any);

            if (!fetchError && updatedProfile) {
              // Cargar direcciones desde la tabla delivery_addresses
              let deliveryAddresses: User['deliveryAddresses'] = [];
              try {
                const { deliveryAddressesService } = await import('../services/deliveryAddressesService');
                const addressesFromTable = await deliveryAddressesService.getAddresses(updatedProfile.id);
                if (addressesFromTable.length > 0) {
                  deliveryAddresses = addressesFromTable;
                } else if (updatedProfile.delivery_addresses && Array.isArray(updatedProfile.delivery_addresses)) {
                  // Si hay direcciones en JSONB pero no en la tabla, sincronizar
                  await deliveryAddressesService.syncFromJSONB(updatedProfile.id, updatedProfile.delivery_addresses);
                  deliveryAddresses = await deliveryAddressesService.getAddresses(updatedProfile.id);
                } else {
                  deliveryAddresses = updatedProfile.delivery_addresses || [];
                }
              } catch (error) {
                console.error('Error loading delivery addresses:', error);
                deliveryAddresses = updatedProfile.delivery_addresses || [];
              }

              // Cargar métodos de pago desde la tabla payment_methods
              let paymentMethods: User['paymentMethods'] = [];
              try {
                const { paymentMethodsService } = await import('../services/paymentMethodsService');
                const methodsFromTable = await paymentMethodsService.getPaymentMethods(updatedProfile.id);
                if (methodsFromTable.length > 0) {
                  paymentMethods = methodsFromTable;
                } else if (updatedProfile.payment_methods && Array.isArray(updatedProfile.payment_methods)) {
                  // Si hay métodos en JSONB pero no en la tabla, sincronizar
                  await paymentMethodsService.syncFromJSONB(updatedProfile.id, updatedProfile.payment_methods);
                  paymentMethods = await paymentMethodsService.getPaymentMethods(updatedProfile.id);
                } else {
                  paymentMethods = updatedProfile.payment_methods || [];
                }
              } catch (error) {
                console.error('Error loading payment methods:', error);
                paymentMethods = updatedProfile.payment_methods || [];
              }

              // Actualizar el usuario local con los datos de Supabase
              const syncedUser: User = {
                id: updatedProfile.id,
                email: updatedProfile.email,
                name: updatedProfile.name,
                phone: updatedProfile.phone,
                profileImage: updatedProfile.profile_image_url,
                preferences: updatedProfile.preferences || { notifications: true, theme: 'auto' },
                paymentMethods,
                deliveryAddresses,
              };

              // Actualizar también en AsyncStorage para mantener sincronizado (sin password)
              const storedUser = {
                ...syncedUser,
                password: '', // UserStorage requiere password, pero no lo tenemos aquí
                createdAt: updatedProfile.created_at || new Date().toISOString(),
              };
              await UserStorage.setCurrentUser(storedUser as any);
              setUser(syncedUser);
              
              return true;
            }
          }
        } catch (supabaseError) {
          console.error('Error in Supabase update:', supabaseError);
          // Continuar con actualización local
        }
      }

      // Actualizar en AsyncStorage (sistema local) - siempre hacer esto como fallback
      const updatedUser = await UserStorage.updateUser(user.id, userData);
      if (updatedUser) {
        await UserStorage.setCurrentUser(updatedUser);
        setUser(updatedUser);

        // Si el usuario no está en Supabase, intentar guardar solo métodos de pago
        if (!isValidUUID) {
          console.warn('Usuario no tiene UUID válido, guardando solo localmente');
        } else if (isSupabaseAvailable() && supabase) {
          // NO guardar métodos de pago aquí - se manejan en la tabla payment_methods
          // Si se pasan paymentMethods, solo actualizar el estado local
          if (userData.paymentMethods !== undefined) {
            console.log('Métodos de pago actualizados localmente (se guardan en tabla payment_methods)');
          }

          // NO guardar direcciones aquí - se manejan en la tabla delivery_addresses
          // Si se pasan deliveryAddresses, solo actualizar el estado local
          if (userData.deliveryAddresses !== undefined) {
            console.log('Direcciones actualizadas localmente (se guardan en tabla delivery_addresses)');
          }
        }

        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Update profile error:', error);
      return false;
    }
  };

  const biometricLogin = async (): Promise<boolean> => {
    try {
      // En web, la autenticación biométrica no está disponible
      if (Platform.OS === 'web') {
        return false;
      }
      
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        return false;
      }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticación biométrica',
        fallbackLabel: 'Usar contraseña',
      });
      
      if (result.success) {
        // Simular login automático con biometría
        return await login('admin@test.com', '123456');
      }
      
      return false;
    } catch (error) {
      console.error('Biometric login error:', error);
      return false;
    }
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      // Simulación de recuperación de contraseña
      console.log('Enviando email de recuperación a:', email);
      return true;
    } catch (error) {
      console.error('Forgot password error:', error);
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      // Simulación de cambio de contraseña
      console.log('Cambiando contraseña...');
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    biometricLogin,
    forgotPassword,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
