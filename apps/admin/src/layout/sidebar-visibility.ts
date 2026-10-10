import { type AdminRouteHandle, useMatches } from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { canAccessSettings, isEditorUser } from '@tryghost/admin-x-framework/api/users';
import { useIsMobile } from '@tryghost/shade/utils';

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
  const isMobile = useIsMobile();

  return matches.some(
    (match) =>
      hidesAdminSidebar(match.handle) ||
      ((!admin7Settings || isMobile) && showsSettingsSidebar(match.handle)),
  );
}

export function useAdminSidebarVisibility(): boolean {
  return !useRouteHidesAdminSidebar();
}
