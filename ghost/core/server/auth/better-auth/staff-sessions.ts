import type { GhostAuth } from './create-auth';
import { sessionCookies } from './session-controller';

export type StaffSessionsDeps = {
  /** Read per call: the instance is built by boot */
  getAuth(): Pick<
    GhostAuth['api'],
    'createVerifiedSession' | 'revokeUserSessions' | 'revokeAllSessions'
  >;
  /** Deletes the user's legacy `sessions` rows */
  deleteLegacyUserSessions(userId: string): Promise<unknown>;
};

/** Session changes on security events under `better-auth` (plan §5.4, Phase 2 steps 7–8). */
export function createStaffSessions(deps: StaffSessionsDeps) {
  return {
    /** Also deletes legacy rows, so a rollback to `legacy` can't revive them (plan §8) */
    async revokeUserSessions(userId: string) {
      await deps.getAuth().revokeUserSessions({ body: { userId } });
      await deps.deleteLegacyUserSessions(userId);
    },

    async revokeAllSessions() {
      await deps.getAuth().revokeAllSessions();
    },

    /** A verified session for a user who just proved who they are; returns its `Set-Cookie` */
    async createVerifiedSession(userId: string): Promise<string[]> {
      const { headers } = await deps.getAuth().createVerifiedSession({
        body: { userId },
        returnHeaders: true,
      });
      return sessionCookies(headers);
    },
  };
}

export type StaffSessions = ReturnType<typeof createStaffSessions>;

let staffSessions: StaffSessions | undefined;

/** Better Auth loads only under its engine, so callers check it first */
export default function getStaffSessions(): StaffSessions {
  if (!staffSessions) {
    const betterAuth = require('./index').default;
    const { knex } = require('../../data/db');

    staffSessions = createStaffSessions({
      getAuth: () => betterAuth.service.api,
      deleteLegacyUserSessions: (userId) => knex('sessions').where({ user_id: userId }).del(),
    });
  }
  return staffSessions;
}
