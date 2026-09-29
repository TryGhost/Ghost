import { type AdminRouteHandle, useMatches } from '@tryghost/admin-x-framework';
import { useSidebarVisibility as useEmberSidebarVisibility } from '@/ember-bridge';
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

export function useAdminSidebarVisibility(): boolean {
  const emberSidebarVisible = useEmberSidebarVisibility();
  const matches = useMatches();
  const admin7Settings = useFeatureFlag('admin7settings');

  const routeHidesSidebar = matches.some((match) => hidesAdminSidebar(match.handle));
  const settingsRoute = matches.some((match) => showsSettingsSidebar(match.handle));

  return emberSidebarVisible && !routeHidesSidebar && (!settingsRoute || admin7Settings);
}
