import { type DemoState, isSsoConfigured } from '@/auth-prototype/demo-store';
import { emailDomain, stableHash } from '@/auth-prototype/fake';

export type StaffSignInMethod = 'sso' | 'app' | 'email';

/**
 * How a staff member signs in, in the demo. You (the signed-in user) follow
 * the demo state; others get a stable fake so the list looks mixed.
 */
export function staffSignInMethod(
  user: { id: string; email: string },
  currentUserId: string,
  demo: DemoState,
): StaffSignInMethod {
  if (isSsoConfigured(demo.sso) && demo.sso.domains.includes(emailDomain(user.email))) {
    return 'sso';
  }
  if (user.id === currentUserId) {
    return demo.twoFactor.method;
  }
  if (demo.twoFactor.resetUserIds.includes(user.id)) {
    return 'email';
  }
  return stableHash(user.id) % 3 === 0 ? 'app' : 'email';
}
