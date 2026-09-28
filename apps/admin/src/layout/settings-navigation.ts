import { createContext, useContext } from 'react';

const SETTINGS_RETURN_TO = 'settingsReturnTo';

type SettingsReturnState = {
  [SETTINGS_RETURN_TO]: string;
};

export function settingsReturnToState(returnTo: string): SettingsReturnState {
  return { [SETTINGS_RETURN_TO]: returnTo };
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

// The settings navigation renders inside the settings app but portals into the
// shell's settings sidebar. The slot element changes whenever the sidebar swaps
// between its desktop panel and the mobile sheet, so it's tracked as state.
export const SettingsNavigationSlotContext = createContext<HTMLElement | null>(null);

export function useSettingsNavigationSlot(): HTMLElement | null {
  return useContext(SettingsNavigationSlotContext);
}
