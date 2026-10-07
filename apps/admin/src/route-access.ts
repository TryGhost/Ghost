import type { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';

type CurrentUser = NonNullable<ReturnType<typeof useCurrentUser>['data']>;

// Route-access contract shared by the shell and the domains: domains type
// their access predicates against this module, not the guard component.
export type AccessRule = (user: CurrentUser, location: { pathname: string }) => boolean;

export interface AccessRouteHandle {
  requiresAccess?: AccessRule;
}
