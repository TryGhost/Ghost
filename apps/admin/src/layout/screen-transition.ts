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
  enabled: boolean;
  settingsSidebarEnabled: boolean;
}

/**
 * A navigation transitions only when it crosses the boundary of a surface
 * marked `screenTransition`: entering one, leaving one, or moving between two.
 * Without admin7settings, Settings is the legacy takeover and is not animated.
 */
export function shouldRunScreenTransition({
  from,
  to,
  enabled,
  settingsSidebarEnabled,
}: ScreenTransitionInput): boolean {
  if (!enabled) {
    return false;
  }

  const fromSurface = screenSurface(from);
  const toSurface = screenSurface(to);
  if (fromSurface === toSurface) {
    return false;
  }

  return settingsSidebarEnabled || !(fromSurface?.settingsSidebar || toSurface?.settingsSidebar);
}

/**
 * Whether the current navigation is a screen transition leaving a full-screen
 * surface. The screen it returns to can render a cheap first frame and fill in
 * after, since the view transition waits on its first render.
 */
export function isReturningFromScreen(): boolean {
  return document.documentElement.dataset.screenTransition === 'return';
}
