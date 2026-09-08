import { useLocation } from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

const editorRoutePattern = /^\/editor(?:\/|$)/;

export function isAdmin7PillAllowedRoute(pathname: string): boolean {
  return !editorRoutePattern.test(pathname);
}

export function useAdmin7Pill() {
  const enabledByFlag = useFeatureFlag('admin7Pill');
  const { pathname } = useLocation();
  const enabledForRoute = isAdmin7PillAllowedRoute(pathname);

  return {
    enabled: enabledByFlag && enabledForRoute,
    enabledByFlag,
    enabledForRoute,
  };
}
