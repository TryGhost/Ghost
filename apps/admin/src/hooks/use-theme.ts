import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAdminThemeController,
  type AdminThemeMode,
  type ResolvedAdminTheme,
} from '@tryghost/admin-x-framework/utils/admin-theme';
import { useEditUserPreferences, useUserPreferences } from '@/hooks/user-preferences';

export type ThemeMode = AdminThemeMode;
export type ResolvedThemeMode = ResolvedAdminTheme;

// App code consumes this once via ThemeProvider/useThemeContext.
export function useTheme() {
  const { data: preferences } = useUserPreferences();
  const { mutateAsync: editPreferences, isPending: isEditingPreferences } =
    useEditUserPreferences();
  const [controller, setController] = useState<ReturnType<typeof createAdminThemeController>>();
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemeMode>('light');
  const [pendingTheme, setPendingTheme] = useState<ThemeMode | null>(null);
  const [isPendingTheme, setIsPendingTheme] = useState(false);
  const pendingRef = useRef(false);

  const isThemeReady = preferences !== undefined;
  const persistedTheme: ThemeMode = preferences?.nightShift ?? 'light';
  const theme: ThemeMode = pendingTheme ?? persistedTheme;

  useEffect(() => {
    const nextController = createAdminThemeController(setResolvedTheme);
    setController(nextController);
    return () => {
      nextController.destroy();
    };
  }, []);

  useEffect(() => {
    if (!isThemeReady) {
      return;
    }
    controller?.setTheme(theme);
  }, [controller, theme, isThemeReady]);

  useEffect(() => {
    if (pendingTheme !== null && persistedTheme === pendingTheme) {
      setPendingTheme(null);
    }
  }, [pendingTheme, persistedTheme]);

  const setTheme = useCallback(
    async (mode: ThemeMode) => {
      if (!controller || pendingRef.current || mode === theme) {
        return;
      }
      pendingRef.current = true;
      setIsPendingTheme(true);

      try {
        setPendingTheme(mode);
        controller.setTheme(mode);
        await editPreferences({ nightShift: mode });
      } catch (error) {
        setPendingTheme(null);
        // Restore the previous choice, resolving system appearance at rollback time.
        controller.setTheme(theme);
        // eslint-disable-next-line no-console
        console.error('[Theme] Failed to update appearance preference:', error);
      } finally {
        pendingRef.current = false;
        setIsPendingTheme(false);
      }
    },
    [controller, editPreferences, theme],
  );

  return {
    theme,
    resolvedTheme,
    isThemeReady,
    setTheme,
    isSettingTheme: isEditingPreferences || isPendingTheme,
  } as const;
}
