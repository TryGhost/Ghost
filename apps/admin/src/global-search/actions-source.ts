import { useMemo } from 'react';
import type { ResolvedThemeMode, ThemeMode } from '@/hooks/use-theme';
import { useThemeContext } from '@/providers/theme-context';
import type { SearchItem, SearchSource } from './search-source';

export const ACTIONS_HEADING = 'Actions';

const APPEARANCE_KEYWORDS = 'appearance dark light night mode';

/** Switches to the opposite of what's on screen, or back to following the system. */
export function appearanceItems(
  theme: ThemeMode,
  resolvedTheme: ResolvedThemeMode,
  setTheme: (mode: ThemeMode) => Promise<void>,
): SearchItem[] {
  const items: SearchItem[] = [
    resolvedTheme === 'dark'
      ? {
          kind: 'action',
          id: 'appearance-light',
          title: 'Switch to light mode',
          keywords: APPEARANCE_KEYWORDS,
          run: () => setTheme('light'),
        }
      : {
          kind: 'action',
          id: 'appearance-dark',
          title: 'Switch to dark mode',
          keywords: APPEARANCE_KEYWORDS,
          run: () => setTheme('dark'),
        },
  ];

  if (theme !== 'system') {
    items.push({
      kind: 'action',
      id: 'appearance-system',
      title: 'Use system appearance',
      keywords: APPEARANCE_KEYWORDS,
      run: () => setTheme('system'),
    });
  }

  return items;
}

/** Things Cmd-K can do in place, for every staff user. */
export function useActionsSearchSource(): SearchSource {
  const { theme, resolvedTheme, isThemeReady, setTheme } = useThemeContext();

  return useMemo(
    () => ({
      id: 'actions',
      heading: ACTIONS_HEADING,
      // labels describe the current appearance, which is unknown until preferences load
      items: isThemeReady ? appearanceItems(theme, resolvedTheme, setTheme) : [],
      isLoading: false,
    }),
    [isThemeReady, theme, resolvedTheme, setTheme],
  );
}
