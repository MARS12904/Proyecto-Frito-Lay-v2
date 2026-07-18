import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { CartProvider } from '../contexts/CartContext';
import { OrdersProvider } from '../contexts/OrdersContext';
import { StockProvider } from '../contexts/StockContext';
import { MetricsProvider } from '../contexts/MetricsContext';
import { WebAlertProvider } from '../components/ui/WebAlertProvider';

export const unstable_settings = { anchor: '(tabs)' };

function RootNavigator() {
  const { isDark } = useTheme();
  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="catalog" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="payments" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <StockProvider>
            <MetricsProvider>
              <OrdersProvider>
                <CartProvider>
                  <RootNavigator />
                  <WebAlertProvider />
                </CartProvider>
              </OrdersProvider>
            </MetricsProvider>
          </StockProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
