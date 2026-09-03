import { useLocation } from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

const approvedRoutePatterns = [/^\/members\/?$/, /^\/members\/import\/?$/, /^\/tags\/?$/];
const tagDetailRoutePattern = /^\/tags\/([^/]+)\/?$/;
const editorRoutePattern = /^\/editor(?:\/|$)/;

function isApprovedTagDetailRoute(pathname: string): boolean {
  const match = tagDetailRoutePattern.exec(pathname);
  return !!match && match[1] !== 'new';
}

export function isAdmin7PillApprovedRoute(pathname: string): boolean {
  if (editorRoutePattern.test(pathname)) {
    return false;
  }

  return (
    approvedRoutePatterns.some((pattern) => pattern.test(pathname)) ||
    isApprovedTagDetailRoute(pathname)
  );
}

export function useAdmin7Pill() {
  const enabledByFlag = useFeatureFlag('admin7Pill');
  const { pathname } = useLocation();
  const enabledForRoute = isAdmin7PillApprovedRoute(pathname);

  return {
    enabled: enabledByFlag && enabledForRoute,
    enabledByFlag,
    enabledForRoute,
  };
}
