import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyEmberAdminThemePreference,
  isEmberThemeManaged,
  preloadEmberAdminThemeStylesheet,
} from '@/ember-bridge';
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
  // swap lands in one paint; double-rAF release mirrors Ember's feature.js.
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

// Applying the DOM theme is only a fallback for running without EmberBridge.
// React still tracks system preference changes so resolvedTheme stays current
// for consumers even when Ember owns the DOM — see isEmberThemeManaged.
function applyAdminTheme(mode: ThemeMode, resolvedTheme: ResolvedThemeMode) {
  if (!applyEmberAdminThemePreference(mode)) {
    applyThemeClass(resolvedTheme);
  }
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
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
    if (isEmberThemeManaged()) {
      return;
    }
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
      // Reflect the choice immediately; cleared on rollback (catch) or once the
      // persisted preference matches (effect above).
      setPendingTheme(mode);

      try {
        const nextResolvedTheme = mode === 'system' ? systemTheme : mode;
        await preloadEmberAdminThemeStylesheet().catch((error) => {
          // eslint-disable-next-line no-console
          console.error('[Theme] Failed to preload admin theme stylesheet:', error);
        });
        applyAdminTheme(mode, nextResolvedTheme);
        await editPreferences({ nightShift: mode });
      } catch (error) {
        setPendingTheme(null);
        applyAdminTheme(theme, resolvedTheme);
        // eslint-disable-next-line no-console
        console.error('[Theme] Failed to update appearance preference:', error);
      } finally {
        pendingRef.current = false;
        setIsPendingTheme(false);
      }
    },
    [editPreferences, resolvedTheme, systemTheme, theme],
  );

  return {
    theme,
    resolvedTheme,
    isThemeReady: preferences !== undefined,
    setTheme,
    isSettingTheme: isEditingPreferences || isPendingTheme,
  } as const;
}
