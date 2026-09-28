import { useEffect } from 'react';
import { type AdminRouteHandle, useLocation, useMatches } from '@tryghost/admin-x-framework';
import { useIsEmberOwnedRoute } from '@/routes';
import {
  syncEmberFullScreen,
  useSidebarVisibility as useEmberSidebarVisibility,
} from '@/ember-bridge';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { canAccessSettings, isEditorUser } from '@tryghost/admin-x-framework/api/users';

function hidesAdminSidebar(handle: unknown): handle is AdminRouteHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'hideAdminSidebar' in handle &&
    handle.hideAdminSidebar === true
  );
}

function showsSettingsSidebar(handle: unknown): handle is AdminRouteHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'settingsSidebar' in handle &&
    handle.settingsSidebar === true
  );
}

/**
 * True when the current route swaps the shell navigation for the Settings
 * navigation. Only users who get the full Settings screen have that navigation;
 * Editors (Staff only) and Authors (their profile) keep the app navigation.
 */
export function useIsSettingsSidebarRoute(): boolean {
  const matches = useMatches();
  const admin7Settings = useFeatureFlag('admin7settings');
  const { data: currentUser } = useCurrentUser();
  const hasSettingsNavigation =
    !!currentUser && canAccessSettings(currentUser) && !isEditorUser(currentUser);

  return (
    admin7Settings &&
    hasSettingsNavigation &&
    matches.some((match) => showsSettingsSidebar(match.handle))
  );
}

export function useRouteHidesAdminSidebar(): boolean {
  const matches = useMatches();
  const admin7Settings = useFeatureFlag('admin7settings');

  // Without admin7settings, Settings is still a full-screen takeover.
  return matches.some(
    (match) =>
      hidesAdminSidebar(match.handle) || (!admin7Settings && showsSettingsSidebar(match.handle)),
  );
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
