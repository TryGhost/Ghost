import assert from 'node:assert/strict';
import { betterAuth } from 'better-auth/minimal';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { ghostSso } from '../../../../../../core/server/auth/better-auth/plugins/sso';
import { ghostStaffLifecycle } from '../../../../../../core/server/auth/better-auth/plugins/staff-lifecycle';

type Row = Record<string, unknown>;

const ORIGIN = 'http://localhost:2368';

function setup(users: Array<{ id: string; status: string }>) {
  const now = new Date();
  const db: Record<string, Row[]> = {
    user: users.map(({ id, status }) => ({
      id,
      status,
      name: id,
      email: `${id}@example.com`,
      emailVerified: true,
      last_seen: null,
      createdAt: now,
      updatedAt: now,
    })),
    account: [],
    session: [],
    verification: [],
  };

  const auth = betterAuth({
    baseURL: ORIGIN,
    secret: 'a'.repeat(64),
    database: memoryAdapter(db),
    user: {
      additionalFields: {
        status: { type: 'string', required: false, input: false },
        last_seen: { type: 'date', required: false, input: false },
      },
    },
    session: {
      additionalFields: {
        verified: { type: 'boolean', defaultValue: false, input: false },
        origin: { type: 'string', required: false, input: false },
      },
    },
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
    logger: { disabled: true },
    plugins: [ghostStaffLifecycle({ sendPasswordResetEmail: async () => {} }), ghostSso()],
  });

  const user = (id: string) => db.user.find((row) => row.id === id)!;
  const sessionsOf = (id: string) => db.session.filter((row) => row.userId === id);
  const createSsoSession = (userId: string) =>
    auth.api.createSsoSession({ body: { userId, origin: ORIGIN }, returnHeaders: true });

  return { auth, user, sessionsOf, createSsoSession };
}

const apiError = (status: string, code: string) => (err: unknown) => {
  const error = err as { status?: string; body?: { code?: string } };
  assert.equal(error.status, status);
  assert.equal(error.body?.code, code);
  return true;
};

describe('ghostSso', function () {
  describe('createSsoSession', function () {
    it('creates a verified session pinned to the origin, with its cookie', async function () {
      const { sessionsOf, user, createSsoSession } = setup([{ id: 'active', status: 'active' }]);

      const { headers } = await createSsoSession('active');

      const [session] = sessionsOf('active');
      assert.equal(session.verified, true);
      assert.equal(session.origin, ORIGIN);
      assert.match(headers.get('set-cookie') ?? '', new RegExp(`=${session.token}\\.`));
      assert.ok(user('active').last_seen instanceof Date);
    });

    it('signs in a warned user and sets them active', async function () {
      const { sessionsOf, user, createSsoSession } = setup([{ id: 'warned', status: 'warn-1' }]);

      await createSsoSession('warned');

      assert.equal(sessionsOf('warned').length, 1);
      assert.equal(user('warned').status, 'active');
    });

    it('unlocks a locked user', async function () {
      const { sessionsOf, user, createSsoSession } = setup([{ id: 'locked', status: 'locked' }]);

      await createSsoSession('locked');

      assert.equal(user('locked').status, 'active');
      assert.equal(sessionsOf('locked').length, 1);
    });

    it('refuses an inactive user', async function () {
      const { sessionsOf, user, createSsoSession } = setup([
        { id: 'inactive', status: 'inactive' },
      ]);

      await assert.rejects(
        createSsoSession('inactive'),
        apiError('FORBIDDEN', 'ACCOUNT_SUSPENDED'),
      );
      assert.equal(user('inactive').status, 'inactive');
      assert.equal(sessionsOf('inactive').length, 0);
    });

    it('refuses an unknown user', async function () {
      const { createSsoSession } = setup([]);

      await assert.rejects(createSsoSession('nobody'), apiError('NOT_FOUND', 'USER_NOT_FOUND'));
    });

    it('is not served over HTTP', async function () {
      const { auth } = setup([{ id: 'active', status: 'active' }]);

      const response = await auth.handler(
        new Request(`${ORIGIN}/api/auth/create-sso-session`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId: 'active', origin: ORIGIN }),
        }),
      );

      assert.equal(response.status, 404);
    });
  });
});
