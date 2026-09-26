import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { applyEmberAdminThemePreference, preloadEmberAdminThemeStylesheet } from '@/ember-bridge';
import { useEditUserPreferences, useUserPreferences } from '@/hooks/user-preferences';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

function getSystemTheme(): ResolvedThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let themeSwitchingFrame: number | undefined;

function applyThemeClass(resolvedTheme: ResolvedThemeMode) {
  const html = document.documentElement;
  // `theme-switching` suppresses transitions (rule in shade/styles.css) so the
  // swap lands in one paint; the second frame releases it once that paint is done.
  html.classList.add('theme-switching');
  html.classList.toggle('dark', resolvedTheme === 'dark');

  if (themeSwitchingFrame !== undefined) {
    cancelAnimationFrame(themeSwitchingFrame);
  }

  themeSwitchingFrame = requestAnimationFrame(() => {
    themeSwitchingFrame = requestAnimationFrame(() => {
      html.classList.remove('theme-switching');
      themeSwitchingFrame = undefined;
    });
  });
}

// Ember switches only its own dark stylesheet; the `dark` class is React's.
// Resolves `system` live, as Ember does, so the two can't disagree after an await.
function applyAdminTheme(mode: ThemeMode) {
  applyEmberAdminThemePreference(mode);
  applyThemeClass(mode === 'system' ? getSystemTheme() : mode);
}

// App code must consume this via ThemeProvider/useThemeContext (src/providers):
// each extra instance forks the optimistic state and re-runs the DOM effects.
export function useTheme() {
  const { data: preferences } = useUserPreferences();
  const { mutateAsync: editPreferences, isPending: isEditingPreferences } =
    useEditUserPreferences();
  const [systemTheme, setSystemTheme] = useState<ResolvedThemeMode>(getSystemTheme);
  const [pendingTheme, setPendingTheme] = useState<ThemeMode | null>(null);
  const [isPendingTheme, setIsPendingTheme] = useState(false);
  const pendingRef = useRef(false);

  const persistedTheme: ThemeMode = preferences?.nightShift ?? 'light';
  const theme: ThemeMode = pendingTheme ?? persistedTheme;
  const resolvedTheme: ResolvedThemeMode = theme === 'system' ? systemTheme : theme;
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      const nextSystemTheme = event.matches ? 'dark' : 'light';
      // Ember swaps its stylesheet inside the same event; waiting for the
      // re-render would paint one frame with the two halves out of step.
      if (themeRef.current === 'system') {
        applyThemeClass(nextSystemTheme);
      }
      setSystemTheme(nextSystemTheme);
    };

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  // Clear the optimistic selection once the persisted preference catches up, so
  // the menu indicator settles on the new value without flickering back via the
  // brief window where the refetched preferences query has no data.
  useEffect(() => {
    if (pendingTheme !== null && persistedTheme === pendingTheme) {
      setPendingTheme(null);
    }
  }, [pendingTheme, persistedTheme]);

  const setTheme = useCallback(
    async (mode: ThemeMode) => {
      if (pendingRef.current || mode === theme) {
        return;
      }

      pendingRef.current = true;
      setIsPendingTheme(true);

      try {
        await preloadEmberAdminThemeStylesheet().catch((error) => {
          // eslint-disable-next-line no-console
          console.error('[Theme] Failed to preload admin theme stylesheet:', error);
        });
        themeRef.current = mode;
        applyAdminTheme(mode);
        // Post-preload so the class effect can't beat Ember's stylesheet; synchronous so
        // JS theme readers flip in the same paint. Cleared on rollback or once persisted.
        flushSync(() => setPendingTheme(mode));
        await editPreferences({ nightShift: mode });
      } catch (error) {
        setPendingTheme(null);
        themeRef.current = theme;
        applyAdminTheme(theme);
        // eslint-disable-next-line no-console
        console.error('[Theme] Failed to update appearance preference:', error);
      } finally {
        pendingRef.current = false;
        setIsPendingTheme(false);
      }
    },
    [editPreferences, theme],
  );

  return {
    theme,
    resolvedTheme,
    isThemeReady: preferences !== undefined,
    setTheme,
    isSettingTheme: isEditingPreferences || isPendingTheme,
  } as const;
}
