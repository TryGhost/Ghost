import { useBrowseUsers } from '@tryghost/admin-x-framework/api/users';
import { presentUsers, unnamedUserIds, type PresentUser } from './present-users';
import type { ActivePresence } from './presence-api';

/** The most users one staff request returns. */
const STAFF_PAGE_SIZE = 100;

/** Names the users in `active` from the staff list, each once and in name order. */
export function usePresentUsers(active: ActivePresence[]): PresentUser[] {
  // The staff list is read only once someone is present, so an empty editor costs no request.
  const { data } = useBrowseUsers({ defaultErrorHandler: false, enabled: active.length > 0 });
  // That list is one page of the most recently seen staff; anyone present beyond it is read by id.
  const unnamed = unnamedUserIds(active, data?.users).slice(0, STAFF_PAGE_SIZE);
  const { data: beyond } = useBrowseUsers({
    defaultErrorHandler: false,
    enabled: unnamed.length > 0,
    searchParams: {
      filter: `id:[${unnamed.map((id) => `'${id}'`).join(',')}]`,
      limit: String(STAFF_PAGE_SIZE),
    },
  });
  return presentUsers(active, data && [...data.users, ...(beyond?.users ?? [])]);
}
