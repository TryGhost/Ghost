import {
  DEFAULT_NAVIGATION_PREFERENCES,
  useEditUserPreferences,
  useUserPreferences,
  type NavigationPreferences,
} from '@/hooks/user-preferences';
import { useMutation, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FLOATING_SIDEBAR_DURATION } from '@tryghost/shade/components';

export type SidebarMode = NonNullable<NavigationPreferences['menu']['mode']>;

export const useNavigationPreferences = (): UseQueryResult<NavigationPreferences> => {
  return useUserPreferences({
    select: (data) => data.navigation,
  });
};

export const useEditNavigationPreferences = (): UseMutationResult<
  void,
  Error,
  Partial<NavigationPreferences>,
  unknown
> => {
  const { mutateAsync: editPreferences } = useEditUserPreferences();

  return useMutation({
    mutationFn: async (updatedNavigationPreferences: Partial<NavigationPreferences>) => {
      await editPreferences({
        navigation: updatedNavigationPreferences,
      });
    },
  });
};

export const useNavigationExpanded = (
  expandedKey: keyof NavigationPreferences['expanded'],
): [boolean, (value: boolean) => Promise<void>] => {
  const { data: navigationPreferences } = useNavigationPreferences();
  const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();

  const expanded = navigationPreferences?.expanded[expandedKey];

  const setExpanded = async (value: boolean) => {
    return editNavigationPreferences({
      expanded: {
        ...(navigationPreferences?.expanded ?? DEFAULT_NAVIGATION_PREFERENCES.expanded),
        [expandedKey]: value,
      },
    });
  };

  return [expanded ?? true, setExpanded];
};

export const useNavigationMenuVisibility = (): [boolean, (value: boolean) => Promise<void>] => {
  const { data: navigationPreferences } = useNavigationPreferences();
  const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();

  const visible = navigationPreferences?.menu.visible;

  const setVisible = async (value: boolean) => {
    return editNavigationPreferences({
      menu: { visible: value },
    });
  };

  return [visible ?? true, setVisible];
};

// Saving updates the current user, re-rendering everything that reads it, so
// it waits until the sidebar has finished pinning or unpinning.
const SIDEBAR_MODE_SAVE_DELAY = FLOATING_SIDEBAR_DURATION + 100;

/**
 * Whether the admin7Design desktop sidebar is pinned ("full") or tucked into
 * its floating circle ("compact"). The new mode shows immediately and persists
 * once the sidebar has settled (toggles in quick succession save once); a
 * failed save falls back to the stored mode.
 *
 * The optimistic value is local, so use this in one place (AdminLayout) and
 * hand the mode down rather than calling it from several components.
 */
export const useSidebarMode = (): [SidebarMode, (mode: SidebarMode) => void] => {
  const { data: navigationPreferences } = useNavigationPreferences();
  const { mutateAsync: editPreferences } = useEditUserPreferences();
  const [pendingMode, setPendingMode] = useState<SidebarMode | null>(null);
  // Saves scheduled or in flight: until they settle, the stored mode can
  // still change underneath the pending one.
  const [unsettledSaves, setUnsettledSaves] = useState(0);

  const persistedMode = navigationPreferences?.menu.mode ?? 'full';
  const mode = pendingMode ?? persistedMode;

  useEffect(() => {
    if (pendingMode !== null && unsettledSaves === 0 && persistedMode === pendingMode) {
      setPendingMode(null);
    }
  }, [pendingMode, persistedMode, unsettledSaves]);

  const save = useCallback(
    (nextMode: SidebarMode) => {
      editPreferences({ navigation: { menu: { mode: nextMode } } })
        .catch((error: unknown) => {
          setPendingMode((current) => (current === nextMode ? null : current));
          // eslint-disable-next-line no-console
          console.error('[Sidebar] Failed to save sidebar mode:', error);
        })
        .finally(() => setUnsettledSaves((count) => count - 1));
    },
    [editPreferences],
  );

  const scheduled = useRef<{ timer: number; mode: SidebarMode } | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const setMode = useCallback((nextMode: SidebarMode) => {
    setPendingMode(nextMode);
    if (scheduled.current) {
      window.clearTimeout(scheduled.current.timer);
    } else {
      setUnsettledSaves((count) => count + 1);
    }
    const timer = window.setTimeout(() => {
      scheduled.current = null;
      saveRef.current(nextMode);
    }, SIDEBAR_MODE_SAVE_DELAY);
    scheduled.current = { timer, mode: nextMode };
  }, []);

  // Leaving before the delay is up still saves.
  useEffect(
    () => () => {
      const pending = scheduled.current;
      if (pending) {
        window.clearTimeout(pending.timer);
        scheduled.current = null;
        saveRef.current(pending.mode);
      }
    },
    [],
  );

  return [mode, setMode];
};
