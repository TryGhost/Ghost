import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isOwnerUser } from '@tryghost/admin-x-framework/api/users';

/** Billing is only for the owner of a Ghost(Pro) site. */
export function useShowGhostPro() {
  const { data: currentUser } = useCurrentUser();
  const { data: config } = useBrowseConfig();

  return Boolean(
    currentUser && config?.config.hostSettings?.billing?.enabled && isOwnerUser(currentUser),
  );
}
