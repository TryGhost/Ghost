import assert from 'node:assert/strict';
import type { Principal } from '../../../../../core/server/auth/principal';
import { tables } from '../../../../../core/server/data/schema';
import { isActiveStaffStatus } from '../../../../../core/shared/staff-status';
import { staffSessionOf } from '../../../../../core/server/services/app-installations/staff-session';

function sessionPrincipal({
  role = 'Administrator',
  status = 'active',
  verified = true,
}: { role?: string; status?: string; verified?: boolean } = {}): Principal {
  return {
    kind: 'user',
    method: 'session',
    user: {
      id: 'user-id',
      email: 'a@example.com',
      name: 'A',
      status,
      roles: [{ id: 'r', name: role }],
    },
    session: {
      id: 'session-id',
      userId: 'user-id',
      expiresAt: Date.now() + 1000,
      verified,
      origin: 'http://127.0.0.1:2369',
    },
  };
}

const refused = { code: 'APP_STAFF_SESSION_REQUIRED', statusCode: 403 };

describe('staffSessionOf', function () {
  it('is the verified session of an active Administrator or the Owner', function () {
    for (const role of ['Administrator', 'Owner']) {
      assert.deepEqual(staffSessionOf(sessionPrincipal({ role })), {
        userId: 'user-id',
        sessionId: 'session-id',
      });
    }
  });

  // Issuing, each call with the token and Better Auth's session gate all read the shared list,
  // so this holds for each of them
  it('accepts exactly the active and warned statuses a staff user can have', function () {
    const statuses: readonly string[] = tables.users.status.validations.isIn[0];
    const active = ['active', 'warn-1', 'warn-2', 'warn-3', 'warn-4'];
    assert.deepEqual(statuses.filter(isActiveStaffStatus).sort(), active);
    for (const status of statuses) {
      if (active.includes(status)) {
        assert.equal(staffSessionOf(sessionPrincipal({ status })).userId, 'user-id', status);
      } else {
        assert.throws(() => staffSessionOf(sessionPrincipal({ status })), refused, status);
      }
    }
  });

  it('refuses other roles', function () {
    for (const role of ['Editor', 'Author', 'Contributor', 'Super Editor']) {
      assert.throws(() => staffSessionOf(sessionPrincipal({ role })), refused);
    }
  });

  it('refuses an unverified session or a user who is not active', function () {
    assert.throws(() => staffSessionOf(sessionPrincipal({ verified: false })), refused);
    assert.throws(() => staffSessionOf(sessionPrincipal({ status: 'locked' })), refused);
  });

  it('refuses a request with no staff session', function () {
    const { user } = sessionPrincipal() as Extract<Principal, { kind: 'user' }>;
    assert.throws(() => staffSessionOf({ kind: 'user', method: 'staff_token', user }), refused);
    assert.throws(() => staffSessionOf({ kind: 'user', method: 'session', user }), refused);
    assert.throws(() => staffSessionOf({ kind: 'anonymous' }), refused);
    assert.throws(() => staffSessionOf(null), refused);
  });
});
