import assert from 'node:assert/strict';
import * as security from '@tryghost/security';
import sinon from 'sinon';
import { knex } from '../../../core/server/data/db';
import config from '../../../core/shared/config';
import urlUtils from '../../../core/shared/url-utils';
import { createAuth } from '../../../core/server/auth/better-auth/create-auth';
import { seedCredentialAccounts } from '../../../core/server/auth/better-auth/seed-credential-accounts';

// Never blocks; the rate limits have their own tests
const allow = () => ({ consume: async () => ({ allowed: true as const }), reset: async () => {} });
const limiters = { globalBlock: allow, globalReset: allow, userLogin: allow, userReset: allow };

// @ts-expect-error Test utilities do not have type definitions.
import testUtils from '../../utils';

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(knex.client.config.client);

describe.skipIf(isSQLite)('Better Auth instance', function () {
  const owner = testUtils.DataGenerator.Content.users[0];

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('users:roles'));

  beforeAll(async function () {
    await seedCredentialAccounts(knex);
  });

  afterEach(function () {
    sinon.restore();
  });

  function build({ deviceVerification = true } = {}) {
    return createAuth({
      db: knex,
      secret: 'a'.repeat(64),
      sessionMaxAgeMs: config.get('admin:sessionMaxAgeMs'),
      urlUtils,
      password: security.password,
      logger: { debug() {}, info() {}, warn() {}, error() {} },
      limiters,
      sendPasswordResetEmail: async () => {},
      isStaffDeviceVerificationEnabled: () => deviceVerification,
    });
  }

  it('signs in with the legacy password and expires the session exactly admin:sessionMaxAgeMs later', async function () {
    const now = new Date('2026-11-05T12:00:00.123Z');
    sinon.useFakeTimers({ now, toFake: ['Date'] });

    const auth = build();
    const result = await auth.api.signInEmail({
      body: { email: owner.email, password: owner.password },
    });
    assert.ok(result.token);

    const row = await knex('user_sessions').where({ token: result.token }).first();
    assert.ok(row);
    assert.equal(row.user_id, owner.id);
    assert.equal(row.verified, 0);
    assert.equal(
      new Date(row.expires_at).getTime(),
      now.getTime() + config.get('admin:sessionMaxAgeMs'),
    );
  });

  it('verifies new sessions when staff device verification is off', async function () {
    const result = await build({ deviceVerification: false }).api.signInEmail({
      body: { email: owner.email, password: owner.password },
    });

    const row = await knex('user_sessions').where({ token: result.token }).first();
    assert.equal(row.verified, 1);
  });

  describe('native responses', function () {
    const origin = urlUtils.getAdminOrigin();
    const url = (path: string) => `${origin}${urlUtils.getSubdir()}/ghost/api/admin/auth${path}`;

    async function signIn(auth: ReturnType<typeof build>) {
      const response = await auth.handler(
        new Request(url('/sign-in/email'), {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin },
          body: JSON.stringify({ email: owner.email, password: owner.password }),
        }),
      );
      assert.equal(response.status, 200);
      const cookie = response.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
      return { body: await response.json(), cookie };
    }

    it('omits the token from /sign-in/email', async function () {
      const { body, cookie } = await signIn(build());

      assert.equal(Object.hasOwn(body, 'token'), false);
      assert.equal(body.user.id, owner.id);
      assert.match(cookie, /ghost-admin-api-session=/);
    });

    it('omits session.token from /get-session', async function () {
      const auth = build();
      const { cookie } = await signIn(auth);

      const response = await auth.handler(
        new Request(url('/get-session'), { headers: { cookie } }),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.ok(body.session.id);
      assert.equal(Object.hasOwn(body.session, 'token'), false);
    });

    it('omits each token from /list-sessions', async function () {
      const auth = build();
      const { cookie } = await signIn(auth);

      const response = await auth.handler(
        new Request(url('/list-sessions'), { headers: { cookie } }),
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.ok(body.length > 0);
      for (const session of body) {
        assert.ok(session.id);
        assert.equal(Object.hasOwn(session, 'token'), false);
      }
    });

    it('keeps the token for server-side calls', async function () {
      const result = await build().api.signInEmail({
        body: { email: owner.email, password: owner.password },
      });
      assert.ok(result.token);
    });
  });

  it('rejects a wrong password', async function () {
    await assert.rejects(
      build().api.signInEmail({ body: { email: owner.email, password: 'wrong-password' } }),
      { status: 'UNAUTHORIZED' },
    );
  });
});
