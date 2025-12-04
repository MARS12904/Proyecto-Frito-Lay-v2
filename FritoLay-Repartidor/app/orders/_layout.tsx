import { Stack } from 'expo-router';

export default function OrdersLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Detalles del Pedido',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}



