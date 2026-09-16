import { createContext, useContext } from 'react';
import type { useTheme } from '@/hooks/use-theme';

export type ThemeContextValue = ReturnType<typeof useTheme>;

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
