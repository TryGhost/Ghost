import { isOwnerUser, useBrowseUsers, type User } from '@tryghost/admin-x-framework/api/users';

/**
 * Resolves the site owner, for the staff-facing owner card on the locked
 * takeover.
 *
 * Queries the Owner directly, so their details are available even when they
 * fall beyond the first page of staff. Returns `undefined` while loading or
 * when the current user's role cannot browse users (e.g. contributors) — callers
 * degrade to copy without the owner's details.
 *
 * Pass `enabled: false` to skip the request entirely: the consuming
 * components mount on every Admin page, so the user list must only be
 * fetched in the rare sessions that actually show the owner.
 */
export function useOwnerUser({ enabled = true }: { enabled?: boolean } = {}): User | undefined {
  const { data } = useBrowseUsers({
    enabled,
    searchParams: { filter: "roles.name:'Owner'", limit: '1', include: 'roles' },
  });
  return data?.users.find(isOwnerUser);
}
