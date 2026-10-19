import { createContext, useContext } from 'react';
import type { AdminRouteHandle } from '@tryghost/admin-x-framework';

function isScreenTransitionHandle(handle: unknown): handle is AdminRouteHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'screenTransition' in handle &&
    handle.screenTransition === true
  );
}

/** The marked surface a route match list is inside, identified by its route's handle. */
function screenSurface(handles: readonly unknown[]): AdminRouteHandle | undefined {
  return handles.find(isScreenTransitionHandle);
}

interface ScreenTransitionInput {
  /** Route handles of the current matches, outermost first. */
  from: readonly unknown[];
  /** Route handles of the target's matches, outermost first. */
  to: readonly unknown[];
  /**
   * Settings opens inside the sidebar the screens around it share (the
   * admin7Design sidebar on desktop), which animates that swap itself.
   */
  settingsInSidebar?: boolean;
}

/**
 * A navigation transitions only when it crosses the boundary of a surface
 * marked `screenTransition`: entering one, leaving one, or moving between two.
 * Where Settings opens inside the sidebar, the sidebar stays and animates the
 * swap itself, so entering it from a screen with the sidebar, or leaving it for
 * one, isn't a screen transition either: a view transition would capture the
 * sidebar mid-morph, and its glass with nothing behind it.
 */
export function shouldRunScreenTransition({
  from,
  to,
  settingsInSidebar = false,
}: ScreenTransitionInput): boolean {
  const fromSurface = screenSurface(from);
  const toSurface = screenSurface(to);
  if (fromSurface === toSurface) {
    return false;
  }

  const settingsInvolved = Boolean(fromSurface?.settingsSidebar || toSurface?.settingsSidebar);
  return !(settingsInSidebar && settingsInvolved && !(fromSurface && toSurface));
}

/**
 * Whether the current navigation is a screen transition leaving a full-screen
 * surface. The screen it returns to can render a cheap first frame and fill in
 * after, since the view transition waits on its first render.
 */
export function isReturningFromScreen(): boolean {
  return document.documentElement.dataset.screenTransition === 'return';
}

/** Whether the current navigation is a screen transition entering a full-screen surface. */
export function isEnteringScreen(): boolean {
  return document.documentElement.dataset.screenTransition === 'after-exit';
}

/**
 * Whether the screen around it opened through a screen transition, so its chrome
 * can animate in as it first renders. Set by ScreenEntranceProvider.
 */
export const ScreenEntranceContext = createContext(false);

export function useScreenEntrance(): boolean {
  return useContext(ScreenEntranceContext);
}
