import { useEffect } from 'react';
import { type AdminRouteHandle, useMatches } from '@tryghost/admin-x-framework';
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
  const emberSidebarVisible = useEmberSidebarVisibility();
  const routeHidesSidebar = useRouteHidesAdminSidebar();

  return emberSidebarVisible && !routeHidesSidebar;
}

/** Publishes whether the current route hides the admin sidebar. */
export function useSyncEmberFullScreen(): void {
  const routeHidesSidebar = useRouteHidesAdminSidebar();

  useEffect(() => syncEmberFullScreen(routeHidesSidebar), [routeHidesSidebar]);
}
