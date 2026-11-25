import assert from 'node:assert/strict';
import type { Principal } from '../../../../../core/server/auth/principal';
import { ACTIVE_STAFF_STATUSES } from '../../../../../core/shared/staff-status';
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

  it('accepts every status the User model counts as active, as each call with the token does', function () {
    const { User } = require('../../../../../core/server/models/user');
    assert.deepEqual([...ACTIVE_STAFF_STATUSES], User.activeStates);
    for (const status of ACTIVE_STAFF_STATUSES) {
      assert.equal(staffSessionOf(sessionPrincipal({ status })).userId, 'user-id', status);
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
