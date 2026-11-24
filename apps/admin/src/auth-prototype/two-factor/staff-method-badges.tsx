import { Badge } from '@tryghost/shade/components';
import { type User } from '@tryghost/admin-x-framework/api/users';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useAuthPrototypeEnabled } from '@/auth-prototype/enabled';
import { useDemoState } from '@/auth-prototype/demo-store';
import { staffSignInMethod } from './staff-method';

const LABELS = { sso: 'SSO', app: 'Two-step', email: 'Two-step off' } as const;

/** E4: how each staff member signs in, next to their name in the staff list. */
export function StaffMethodBadges({ user }: { user: User }) {
  const enabled = useAuthPrototypeEnabled();
  const demo = useDemoState();
  const { currentUser } = useGlobalData();

  if (!enabled) {
    return null;
  }

  const method = staffSignInMethod(user, currentUser.id, demo);
  return (
    <Badge className="ml-2 align-middle" variant={method === 'email' ? 'outline' : 'secondary'}>
      {LABELS[method]}
    </Badge>
  );
}
