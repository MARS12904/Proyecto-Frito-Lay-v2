import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAuth } from './AuthContext';

export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colors: typeof Colors.light;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useSystemColorScheme();
  const { user } = useAuth();

  const preference: ThemePreference = user?.preferences?.theme ?? 'auto';

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (preference === 'auto') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return preference;
  }, [preference, systemScheme]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      colors: Colors[resolvedTheme],
      isDark: resolvedTheme === 'dark',
    }),
    [preference, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      preference: 'auto',
      resolvedTheme: 'light',
      colors: Colors.light,
      isDark: false,
    };
  }
  return context;
};

export const useAppColors = () => useTheme().colors;
