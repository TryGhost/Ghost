import { isAdminUser, isOwnerUser } from '@tryghost/admin-x-framework/api/users';

type HasRoles = Parameters<typeof isOwnerUser>[0];

/**
 * Apps act with the signed-in staff user's session for now, so installing, approving and
 * managing them is for the Owner and Administrators, as the Admin API's permissions say.
 */
export function canManageApps(user: HasRoles) {
  return isOwnerUser(user) || isAdminUser(user);
}
