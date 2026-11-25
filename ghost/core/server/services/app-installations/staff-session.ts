import type { AppFailureCode } from '@tryghost/app-contracts';
import errors from '@tryghost/errors';
import type { Principal } from '../../auth/principal';
import { isActiveStaffStatus } from '../../../shared/staff-status';

/** Who an app session's tokens act for, and the staff session they're bound to. */
export interface StaffSession {
  userId: string;
  sessionId: string;
}

// Only they may open apps until other roles' access is decided
const APP_ROLES = new Set(['Administrator', 'Owner']);

/**
 * The verified Better Auth staff session of an active Administrator or Owner behind a
 * request. Anything else, such as a staff token or an integration's key, gets no app token.
 */
export function staffSessionOf(principal: Principal | null | undefined): StaffSession {
  if (
    principal?.kind === 'user' &&
    principal.method === 'session' &&
    principal.session?.verified === true &&
    isActiveStaffStatus(principal.user.status) &&
    principal.user.roles.some(({ name }) => APP_ROLES.has(name))
  ) {
    return { userId: principal.user.id, sessionId: principal.session.id };
  }
  throw staffSessionRequired();
}

/** The request isn't, or is no longer, a staff session that may open apps. */
export function staffSessionRequired() {
  return new errors.NoPermissionError({
    message: 'Apps open only in a signed-in Administrator’s or Owner’s session.',
    code: 'APP_STAFF_SESSION_REQUIRED' satisfies AppFailureCode,
  });
}
