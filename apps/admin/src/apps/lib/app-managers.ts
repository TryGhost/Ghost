import { type User, isOwnerUser, useBrowseUsers } from '@tryghost/admin-x-framework/api/users';

/** How many Administrators to list alongside the Owner. */
export const ADMINISTRATOR_LIMIT = 4;

export const OWNER_FILTER = "roles.name:'Owner'";
export const ADMINISTRATOR_FILTER = "roles.name:'Administrator'+status:-inactive";

/**
 * The people a staff user can ask to install an app: the Owner, then the first
 * few active Administrators. The Owner is queried on its own so it's always
 * listed, however many Administrators come before it in the staff list.
 */
export function useAppManagers(): { managers: User[]; isLoading: boolean } {
  const owner = useBrowseUsers({
    searchParams: { filter: OWNER_FILTER, limit: '1', include: 'roles' },
  });
  const administrators = useBrowseUsers({
    searchParams: {
      filter: ADMINISTRATOR_FILTER,
      limit: String(ADMINISTRATOR_LIMIT),
      include: 'roles',
    },
  });

  return {
    managers: [
      ...(owner.data?.users.filter(isOwnerUser) ?? []),
      ...(administrators.data?.users.slice(0, ADMINISTRATOR_LIMIT) ?? []),
    ],
    isLoading: owner.isLoading || administrators.isLoading,
  };
}
