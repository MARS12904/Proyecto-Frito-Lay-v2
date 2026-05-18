import { UserStorage } from './userStorage';

export const seedTestUsers = async (): Promise<void> => {
  try {
    const existingUsers = await UserStorage.getRegisteredUsers();
    if (existingUsers.length > 0) {
      console.log('Ya existen usuarios registrados, no se crearán usuarios de prueba');
      return;
    }

    const testUsers = [
      {
        email: 'comerciante1@test.com',
        name: 'Juan Pérez - Comerciante',
        phone: '+51987654322',
        password: 'comerciante123',
        preferences: {
          notifications: true,
          theme: 'light' as const,
        },
      },
      {
        email: 'comerciante2@test.com',
        name: 'María García - Tienda El Sol',
        phone: '+51987654323',
        password: 'tienda123',
        preferences: {
          notifications: false,
          theme: 'dark' as const,
        },
      },
    ];

    for (const userData of testUsers) {
      try {
        await UserStorage.registerUser(userData);
        console.log(`Usuario de prueba creado: ${userData.email}`);
      } catch (error) {
        console.error(`Error creando usuario ${userData.email}:`, error);
      }
    }

    console.log('Usuarios de prueba creados exitosamente');
  } catch (error) {
    console.error('Error creando usuarios de prueba:', error);
  }
};

export const clearAllUsers = async (): Promise<void> => {
  try {
    await UserStorage.saveRegisteredUsers([]);
    await UserStorage.clearCurrentUser();
    console.log('Todos los usuarios han sido eliminados');
  } catch (error) {
    console.error('Error limpiando usuarios:', error);
  }
};
