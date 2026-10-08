import { type User, useBrowseUsers } from '@tryghost/admin-x-framework/api/users';

/** How many of the site's managers to list. */
export const MANAGER_LIMIT = 5;

/** The staff who can install apps: the Owner and active Administrators. */
export const MANAGER_FILTER = 'roles.name:[Owner,Administrator]+status:-inactive';

/** The people a staff user can ask to install an app, as the staff list orders them. */
export function useAppManagers(): { managers: User[]; isLoading: boolean } {
  const { data, isLoading } = useBrowseUsers({
    searchParams: { filter: MANAGER_FILTER, limit: String(MANAGER_LIMIT), include: 'roles' },
  });
  return { managers: data?.users ?? [], isLoading };
}
