import { isAdminUser, isOwnerUser } from '@tryghost/admin-x-framework/api/users';

type HasRoles = Parameters<typeof isOwnerUser>[0];

/**
 * Apps act with the signed-in staff user's session in this slice, so
 * installing, opening and removing them is an Owner or Administrator decision.
 */
export function canManageApps(user: HasRoles) {
  return isOwnerUser(user) || isAdminUser(user);
}
