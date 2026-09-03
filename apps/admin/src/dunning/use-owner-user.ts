import { isOwnerUser, useBrowseUsers, type User } from '@tryghost/admin-x-framework/api/users';

/**
 * Resolves the site owner, for the staff-facing owner card on the locked
 * takeover.
 *
 * Loads the user list and picks the Owner from it, mirroring how the Ember
 * billing service resolves it. Returns `undefined` while loading or when the
 * current user's role cannot browse users (e.g. contributors) — callers
 * degrade to copy without the owner's details.
 */
export function useOwnerUser(): User | undefined {
  const { data } = useBrowseUsers();
  return data?.users.find(isOwnerUser);
}
