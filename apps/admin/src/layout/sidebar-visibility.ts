import { useEffect } from 'react';
import { type AdminRouteHandle, useLocation, useMatches } from '@tryghost/admin-x-framework';
import { useIsEmberOwnedRoute } from '@/routes';
import {
  syncEmberFullScreen,
  useSidebarVisibility as useEmberSidebarVisibility,
} from '@/ember-bridge';

function hidesAdminSidebar(handle: unknown): handle is AdminRouteHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'hideAdminSidebar' in handle &&
    handle.hideAdminSidebar === true
  );
}

export function useRouteHidesAdminSidebar(): boolean {
  const matches = useMatches();

  return matches.some((match) => hidesAdminSidebar(match.handle));
}

export function useAdminSidebarVisibility(): boolean {
  const { pathname } = useLocation();
  const isEmberOwned = useIsEmberOwnedRoute(pathname);
  const emberSidebarVisible = useEmberSidebarVisibility();
  const routeHidesSidebar = useRouteHidesAdminSidebar();

  // Ember can retain fullscreen state after handing navigation to React.
  // Only let that state govern a screen Ember is currently serving.
  return !routeHidesSidebar && (!isEmberOwned || emberSidebarVisible);
}

/** Publishes whether the current route hides the admin sidebar. */
export function useSyncEmberFullScreen(): void {
  const routeHidesSidebar = useRouteHidesAdminSidebar();

  useEffect(() => syncEmberFullScreen(routeHidesSidebar), [routeHidesSidebar]);
}
