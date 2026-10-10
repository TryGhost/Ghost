import { createContext, useContext, useMemo } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';

const SETTINGS_RETURN_TO = 'settingsReturnTo';

type SettingsReturnState = {
  [SETTINGS_RETURN_TO]: string;
};

export function settingsReturnToState(returnTo: string): SettingsReturnState {
  return { [SETTINGS_RETURN_TO]: returnTo };
}

/** Retains the app route that first opened Settings across in-Settings navigation. */
export function preserveSettingsReturnToState(
  state: unknown,
  fallback: string,
): SettingsReturnState {
  return settingsReturnToState(getSettingsReturnTo(state) ?? fallback);
}

/** Captures the current app route before navigating into Settings. */
export function useSettingsReturnToState(): SettingsReturnState {
  const location = useLocation();

  return useMemo(
    () =>
      preserveSettingsReturnToState(
        location.state,
        `${location.pathname}${location.search}${location.hash}`,
      ),
    [location.hash, location.pathname, location.search, location.state],
  );
}

export function getSettingsReturnTo(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null) {
    return undefined;
  }

  const returnTo = (state as Record<string, unknown>)[SETTINGS_RETURN_TO];

  // Only same-app paths outside Settings are valid return targets.
  if (typeof returnTo !== 'string' || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return undefined;
  }

  return /^\/settings(?:[/?#]|$)/.test(returnTo) ? undefined : returnTo;
}

// The Settings navigation renders inside the Settings app but portals into the
// desktop shell's Settings sidebar, so the slot is tracked as state.
export const SettingsNavigationSlotContext = createContext<HTMLElement | null>(null);

export function useSettingsNavigationSlot(): HTMLElement | null {
  return useContext(SettingsNavigationSlotContext);
}

// Whether the floating sidebar is still growing to show the Settings
// navigation: Settings holds its heavy sections back until it's done, so
// rendering them doesn't stall the morph.
export const SettingsSidebarMorphingContext = createContext(false);

export function useSettingsSidebarMorphing(): boolean {
  return useContext(SettingsSidebarMorphingContext);
}
