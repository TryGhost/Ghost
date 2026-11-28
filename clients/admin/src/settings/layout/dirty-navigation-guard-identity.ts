import { matchRoutes } from '@tryghost/admin-x-framework';
import { type SettingsRouteHandle, settingsRouteChildren } from '@/settings/routes';

// Which dialog a settings path renders: routes sharing a `handle.dialogGroup` are one
// dialog instance (tabs/steps) for the same record, any other leaf route is its own,
// and section roots or anything outside settings count as leaving every dialog.
export const dialogIdentity = (pathname: string): string => {
  if (pathname !== '/settings' && !pathname.startsWith('/settings/')) {
    return 'outside';
  }
  const match = matchRoutes(settingsRouteChildren, pathname.slice('/settings'.length) || '/')?.at(
    -1,
  );
  if (!match?.route.lazy) {
    return 'settings';
  }
  const group = (match.route.handle as SettingsRouteHandle | undefined)?.dialogGroup;
  const routeIdentity = group ? `group:${group}` : `route:${match.route.path ?? ''}`;
  return `${routeIdentity}:${JSON.stringify(match.params)}`;
};
