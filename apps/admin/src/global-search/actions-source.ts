import { useMemo } from 'react';
import type { ResolvedThemeMode, ThemeMode } from '@/hooks/use-theme';
import { useThemeContext } from '@/providers/theme-context';
import type { SearchItem, SearchSource } from './search-source';

export const ACTIONS_HEADING = 'Actions';

const APPEARANCE_KEYWORDS = 'appearance toggle dark light night mode';

/** Switches to the opposite of what's on screen. */
export function appearanceItem(
  resolvedTheme: ResolvedThemeMode,
  setTheme: (mode: ThemeMode) => Promise<void>,
): SearchItem {
  return resolvedTheme === 'dark'
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
      };
}

/** Things Cmd-K can do in place, for every staff user. */
export function useActionsSearchSource(): SearchSource {
  const { resolvedTheme, isThemeReady, setTheme } = useThemeContext();

  return useMemo(
    () => ({
      id: 'actions',
      heading: ACTIONS_HEADING,
      // labels describe the current appearance, which is unknown until preferences load
      items: isThemeReady ? [appearanceItem(resolvedTheme, setTheme)] : [],
      isLoading: false,
    }),
    [isThemeReady, resolvedTheme, setTheme],
  );
}
