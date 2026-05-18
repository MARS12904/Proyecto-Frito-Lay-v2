import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          title: 'Perfil'
        }} 
      />
      <Stack.Screen 
        name="edit" 
        options={{ 
          headerShown: false,
          title: 'Editar Perfil'
        }} 
      />
      <Stack.Screen 
        name="change-password" 
        options={{ 
          headerShown: false,
          title: 'Cambiar Contraseña'
        }} 
      />
      <Stack.Screen
        name="delivery-addresses"
        options={{
          headerShown: false,
          title: 'Direcciones',
        }}
      />
      <Stack.Screen
        name="payment-methods"
        options={{
          headerShown: false,
          title: 'Métodos de pago',
        }}
      />
    </Stack>
  );
}
