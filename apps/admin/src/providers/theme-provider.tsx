import type { ReactNode } from 'react';
import { ThemeContext } from '@/providers/theme-context';
import { useTheme } from '@/hooks/use-theme';

// Instantiates useTheme exactly once so every consumer shares the same
// optimistic theme state and a single set of bridge/DOM effects.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
