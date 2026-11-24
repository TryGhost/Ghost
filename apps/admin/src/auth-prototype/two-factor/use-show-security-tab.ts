import { type User, hasAdminAccess } from '@tryghost/admin-x-framework/api/users';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useAuthPrototypeEnabled } from '@/auth-prototype/enabled';

/** Whether the staff modal should show the Security tab for this user. */
export function useShowSecurityTab(user: User): boolean {
  const enabled = useAuthPrototypeEnabled();
  const { currentUser } = useGlobalData();
  return enabled && (user.id === currentUser.id || hasAdminAccess(currentUser));
}
