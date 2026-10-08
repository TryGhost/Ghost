import { type AdminRouteHandle, useMatches } from '@tryghost/admin-x-framework';

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
  return !useRouteHidesAdminSidebar();
}
