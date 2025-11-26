import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PaymentMethod {
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
}

export interface DeliveryAddress {
  id: string;
  address: string;
  zone?: string;
  notes?: string;
  isDefault?: boolean;
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  password: string;
  profileImage?: string;
  preferences?: {
    notifications: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  paymentMethods?: PaymentMethod[];
  deliveryAddresses?: DeliveryAddress[];
  createdAt: string;
  lastLogin?: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

const USERS_STORAGE_KEY = 'registered_users';
const CURRENT_USER_KEY = 'current_user';

export class UserStorage {
  // Obtener todos los usuarios registrados
  static async getRegisteredUsers(): Promise<StoredUser[]> {
    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('Error getting registered users:', error);
      return [];
    }
  }

  // Guardar todos los usuarios registrados
  static async saveRegisteredUsers(users: StoredUser[]): Promise<void> {
    try {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving registered users:', error);
      throw error;
    }
  }

  // Registrar un nuevo usuario
  static async registerUser(userData: Omit<StoredUser, 'id' | 'createdAt' | 'lastLogin'>): Promise<StoredUser> {
    try {
      const existingUsers = await this.getRegisteredUsers();
      
      // Verificar si el email ya existe
      const emailExists = existingUsers.some(user => user.email.toLowerCase() === userData.email.toLowerCase());
      if (emailExists) {
        throw new Error('El email ya está registrado');
      }

      const newUser: StoredUser = {
        ...userData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      const updatedUsers = [...existingUsers, newUser];
      await this.saveRegisteredUsers(updatedUsers);
      
      return newUser;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  // Validar credenciales de login
  static async validateCredentials(email: string, password: string): Promise<StoredUser | null> {
    try {
      const users = await this.getRegisteredUsers();
      const user = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === password // En producción, comparar hash
      );
      
      if (user) {
        // Actualizar último login
        user.lastLogin = new Date().toISOString();
        await this.saveRegisteredUsers(users);
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Error validating credentials:', error);
      return null;
    }
  }

  // Obtener usuario por ID
  static async getUserById(id: string): Promise<StoredUser | null> {
    try {
      const users = await this.getRegisteredUsers();
      return users.find(user => user.id === id) || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Actualizar usuario
  static async updateUser(userId: string, updates: Partial<StoredUser>): Promise<StoredUser | null> {
    try {
      const users = await this.getRegisteredUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        return null;
      }

      users[userIndex] = { ...users[userIndex], ...updates };
      await this.saveRegisteredUsers(users);
      
      return users[userIndex];
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  // Eliminar usuario
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const users = await this.getRegisteredUsers();
      const filteredUsers = users.filter(user => user.id !== userId);
      await this.saveRegisteredUsers(filteredUsers);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Guardar usuario actual (sesión activa)
  static async setCurrentUser(user: StoredUser | null): Promise<void> {
    try {
      if (user) {
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch (error) {
      console.error('Error setting current user:', error);
    }
  }

  // Obtener usuario actual (sesión activa)
  static async getCurrentUser(): Promise<StoredUser | null> {
    try {
      const userData = await AsyncStorage.getItem(CURRENT_USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Limpiar sesión actual
  static async clearCurrentUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    } catch (error) {
      console.error('Error clearing current user:', error);
    }
  }

  // Verificar si un email está registrado
  static async isEmailRegistered(email: string): Promise<boolean> {
    try {
      const users = await this.getRegisteredUsers();
      return users.some(user => user.email.toLowerCase() === email.toLowerCase());
    } catch (error) {
      console.error('Error checking email registration:', error);
      return false;
    }
  }

  // Obtener estadísticas de usuarios
  static async getUserStats(): Promise<{
    totalUsers: number;
    recentLogins: number;
    lastRegistration?: string;
  }> {
    try {
      const users = await this.getRegisteredUsers();
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const recentLogins = users.filter(user => 
        user.lastLogin && new Date(user.lastLogin) > oneWeekAgo
      ).length;

      const lastRegistration = users.length > 0 
        ? users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
        : undefined;

      return {
        totalUsers: users.length,
        recentLogins,
        lastRegistration
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        totalUsers: 0,
        recentLogins: 0
      };
    }
  }
}
