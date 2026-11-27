import { isAdminUser, isOwnerUser } from '@tryghost/admin-x-framework/api/users';

type HasRoles = Parameters<typeof isOwnerUser>[0];

/**
 * Apps act for the signed-in staff user, and only the Owner and Administrators get app tokens,
 * so installing, approving, managing and opening apps is for them, as the Admin API's
 * permissions say.
 */
export function canManageApps(user: HasRoles) {
  return isOwnerUser(user) || isAdminUser(user);
}

/** Who Admin shows Apps to: those who can manage them, while the `apps` Labs flag is on. */
export function canSeeApps(user: HasRoles | undefined, appsEnabled: boolean) {
  return appsEnabled && Boolean(user && canManageApps(user));
}
