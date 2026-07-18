import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { seedTestUsers } from '../data/seedUsers';
import { UserStorage, PaymentMethod, DeliveryAddress } from '../data/userStorage';

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
  paymentMethods?: PaymentMethod[];
  deliveryAddresses?: DeliveryAddress[];
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

const saveBiometricCredentials = async (email: string, password: string): Promise<void> => {
  if (Platform.OS === 'web') return;
  await setSecureItem('biometricEmail', email.toLowerCase().trim());
  await setSecureItem('biometricPassword', password);
};

type AuthErrorLike = { message?: string; status?: number };

/** Errores de Supabase Auth que no deben usar modo local */
const handleKnownSupabaseAuthError = (error: AuthErrorLike, context: 'login' | 'register'): boolean => {
  const msg = (error.message || '').toLowerCase();
  const status = error.status;

  if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
    Alert.alert(
      'Correo sin confirmar',
      'Debes confirmar tu email antes de iniciar sesión.\n\n' +
        '1. Revisa tu bandeja (y spam).\n' +
        '2. O en Supabase: Authentication → Users → tu usuario → Confirm user.\n' +
        '3. En desarrollo puedes desactivar "Confirm email" en Authentication → Providers → Email.'
    );
    return true;
  }

  if (status === 429 || msg.includes('rate limit')) {
    Alert.alert(
      'Demasiados intentos',
      'Supabase limitó el envío de correos (error 429).\n\n' +
        'Espera unos minutos y no vuelvas a registrarte.\n' +
        'Si ya tienes cuenta, confirma el email e inicia sesión.\n\n' +
        'En desarrollo: desactiva "Confirm email" en Supabase para evitar este límite.'
    );
    return true;
  }

  if (context === 'register' && (msg.includes('already registered') || msg.includes('already exists'))) {
    Alert.alert('Cuenta existente', 'Este email ya está registrado. Inicia sesión o confirma tu correo si aún no lo hiciste.');
    return true;
  }

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    Alert.alert('Credenciales incorrectas', 'Email o contraseña incorrectos.');
    return true;
  }

  return false;
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
            const { paymentMethodsService } = await import('../services/paymentMethodsService');
            const { deliveryAddressesService } = await import('../services/deliveryAddressesService');
            const [paymentMethods, deliveryAddresses] = await Promise.all([
              paymentMethodsService.getPaymentMethods(currentUser.id),
              deliveryAddressesService.getAddresses(currentUser.id),
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
            if (handleKnownSupabaseAuthError(authError, 'login')) {
              return false;
            }
            Alert.alert('Error al iniciar sesión', authError.message || 'No se pudo iniciar sesión.');
            return false;
          }

          if (authData?.user) {
            // Obtener perfil del usuario desde Supabase (usar 'as any' para evitar errores de tipos)
            const { data: profile, error: profileError } = await (supabase
              .from('user_profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single() as any);

            if (profileError) {
              console.warn('Perfil no encontrado, intentando ensure_user_profile...');
              const { data: rpcRows, error: rpcError } = await (supabase as any).rpc(
                'ensure_user_profile',
                {
                  p_name: authData.user.user_metadata?.name || email.split('@')[0],
                  p_phone: null,
                }
              );

              let newProfile = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;

              if (rpcError || !newProfile) {
                const { data: inserted, error: createError } = await supabase
                  .from('user_profiles')
                  .insert({
                    id: authData.user.id,
                    email: authData.user.email || email,
                    name: authData.user.user_metadata?.name || email.split('@')[0],
                    is_active: true,
                  } as any)
                  .select()
                  .single();

                if (createError || !inserted) {
                  console.error('Error creating profile:', createError || rpcError);
                  return await loginLocal(email, password);
                }
                newProfile = inserted;
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
              await saveBiometricCredentials(email, password);
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
            await saveBiometricCredentials(email, password);
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
        await saveBiometricCredentials(email, password);
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
                phone: userData.phone,
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

            if (handleKnownSupabaseAuthError(authError, 'register')) {
              return false;
            }

            if (authError.message.includes('Database error')) {
              Alert.alert(
                'Error de base de datos',
                'Problema al crear el usuario. Ejecuta scripts/fix-user-profiles-rls.sql en Supabase.\n\n' +
                  authError.message
              );
              return false;
            }

            Alert.alert('Error al registrarse', authError.message || 'No se pudo completar el registro.');
            return false;
          }

          if (authData?.user) {
            console.log('Usuario creado en Supabase Auth:', authData.user.id);

            const { data: sessionData } = await supabase.auth.getSession();
            const hasSession = !!sessionData?.session;

            if (!hasSession) {
              Alert.alert(
                'Confirma tu correo',
                'Te enviamos un enlace de confirmación. Ábrelo y luego inicia sesión para completar tu perfil.'
              );
              return true;
            }

            let profile: any = null;

            const ensureProfile = async (): Promise<any> => {
              const { data, error } = await (supabase as any).rpc('ensure_user_profile', {
                p_name: userData.name.trim(),
                p_phone: userData.phone?.trim() || null,
              });
              if (error) {
                console.warn('ensure_user_profile:', error.message);
                return null;
              }
              return Array.isArray(data) ? data[0] : data;
            };

            for (let attempt = 0; attempt < 3 && !profile; attempt++) {
              const result: any = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', authData.user.id)
                .maybeSingle();

              profile = result.data;
              if (profile) break;

              if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 400));
              }
            }

            if (!profile) {
              profile = await ensureProfile();
            } else if (userData.phone) {
              // Si el perfil ya existe (ej: creado por el trigger handle_new_user), actualizamos el teléfono
              const { data: updatedProfile, error: updateError } = await supabase
                .from('user_profiles')
                .update({ phone: userData.phone.trim() })
                .eq('id', authData.user.id)
                .select()
                .single();
              if (!updateError && updatedProfile) {
                profile = updatedProfile;
              } else {
                console.warn('Error updating phone on existing profile:', updateError);
              }
            }

            if (!profile) {
              const { data: newProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert({
                  id: authData.user.id,
                  email: (authData.user.email || userData.email).toLowerCase().trim(),
                  name: userData.name.trim(),
                  phone: userData.phone?.trim() || null,
                  is_active: true,
                  preferences: userData.preferences || { notifications: true, theme: 'auto' },
                } as any)
                .select()
                .single();

              if (createError || !newProfile) {
                console.error('Error creating profile:', createError);
                Alert.alert(
                  'Error al crear perfil',
                  'Tu cuenta se creó en Auth pero falta el perfil en la base de datos.\n\n' +
                    'En Supabase ejecuta el script: scripts/fix-user-profiles-rls.sql\n\n' +
                    (createError?.message || '')
                );
                return false;
              }
              profile = newProfile;
            }

            console.log('Usuario registrado exitosamente en Supabase:', authData.user.email);
            return true;
          }

          return false;
        } catch (supabaseError) {
          console.error('Error in Supabase registration:', supabaseError);
          Alert.alert('Error', 'No se pudo conectar con Supabase. Revisa tu conexión e intenta de nuevo.');
          return false;
        }
      }

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
        const savedEmail = await getSecureItem('biometricEmail');
        const savedPassword = await getSecureItem('biometricPassword');
        if (savedEmail && savedPassword) {
          return await login(savedEmail, savedPassword);
        }
      }
      
      return false;
    } catch (error) {
      console.error('Biometric login error:', error);
      return false;
    }
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const { supabase, isSupabaseAvailable } = await import('../lib/supabase');
      
      if (isSupabaseAvailable() && supabase) {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: Platform.OS === 'web' && typeof window !== 'undefined'
              ? `${window.location.origin}/auth/login`
              : undefined,
          });
          
          if (error) {
            console.error('Supabase forgot password error:', error);
            Alert.alert('Error', error.message || 'No se pudo enviar el correo de recuperación.');
            return false;
          }
          return true;
        } catch (supabaseError) {
          console.error('Error in Supabase forgotPassword:', supabaseError);
        }
      }

      // Fallback local: verificar si el correo está registrado en el almacenamiento local
      const isRegistered = await UserStorage.isEmailRegistered(normalizedEmail);
      if (isRegistered) {
        console.log('Simulación de recuperación local enviada a:', normalizedEmail);
        return true;
      } else {
        Alert.alert('Error', 'El correo ingresado no está registrado.');
        return false;
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      if (!user) {
        Alert.alert('Error', 'No hay sesión de usuario activa.');
        return false;
      }

      const { supabase, isSupabaseAvailable } = await import('../lib/supabase');
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);

      if (isSupabaseAvailable() && supabase && isValidUUID) {
        try {
          // Para cambiar contraseña en Supabase de forma segura, primero intentamos iniciar sesión
          // con la contraseña actual para verificar que es correcta.
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email.toLowerCase().trim(),
            password: currentPassword,
          });

          if (signInError) {
            console.error('Error al verificar la contraseña actual con Supabase:', signInError);
            Alert.alert('Error', 'La contraseña actual es incorrecta.');
            return false;
          }

          // Actualizar contraseña en Supabase
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (updateError) {
            console.error('Error al cambiar la contraseña en Supabase:', updateError);
            Alert.alert('Error', updateError.message || 'No se pudo actualizar la contraseña.');
            return false;
          }

          return true;
        } catch (supabaseError) {
          console.error('Error in Supabase changePassword:', supabaseError);
          Alert.alert('Error', 'Error de conexión al cambiar la contraseña.');
          return false;
        }
      }

      // Fallback local
      const storedUser = await UserStorage.getUserById(user.id);
      if (!storedUser || storedUser.password !== currentPassword) {
        Alert.alert('Error', 'La contraseña actual es incorrecta.');
        return false;
      }

      const updatedUser = await UserStorage.updateUser(user.id, { password: newPassword });
      if (updatedUser) {
        await UserStorage.setCurrentUser(updatedUser);
        // Actualizar credenciales biométricas si estaban guardadas
        await saveBiometricCredentials(user.email, newPassword);
        return true;
      }

      return false;
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
