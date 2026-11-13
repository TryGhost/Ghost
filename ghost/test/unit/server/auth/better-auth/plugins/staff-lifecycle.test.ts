import assert from 'node:assert/strict';
import { runWithTransaction } from '@better-auth/core/context';
import { betterAuth } from 'better-auth/minimal';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createAuthEndpoint } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import { z } from 'zod';
import { ghostStaffLifecycle } from '../../../../../../core/server/auth/better-auth/plugins/staff-lifecycle';

type Row = Record<string, unknown>;

const PASSWORD = 'correct horse battery staple';

// Creates sessions from a path the plugin does or doesn't treat as passwordless
const sessionCreator = {
  id: 'test-session-creator',
  endpoints: {
    magicLinkVerify: createAuthEndpoint(
      '/magic-link/verify',
      { method: 'POST', body: z.object({ userId: z.string() }) },
      async (ctx) => ctx.json(await ctx.context.internalAdapter.createSession(ctx.body.userId)),
    ),
    otherSignIn: createAuthEndpoint(
      '/test/other-sign-in',
      { method: 'POST', body: z.object({ userId: z.string() }) },
      async (ctx) => ctx.json(await ctx.context.internalAdapter.createSession(ctx.body.userId)),
    ),
  },
} satisfies BetterAuthPlugin;

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
    account: users.map(({ id }) => ({
      id: `account-${id}`,
      userId: id,
      accountId: id,
      providerId: 'credential',
      password: `hashed:${PASSWORD}`,
      createdAt: now,
      updatedAt: now,
    })),
    session: [],
    verification: [],
  };
  const resetEmails: string[] = [];

  const auth = betterAuth({
    baseURL: 'http://localhost:2368',
    secret: 'a'.repeat(64),
    database: memoryAdapter(db),
    emailAndPassword: {
      enabled: true,
      password: {
        hash: async (password) => `hashed:${password}`,
        verify: async ({ hash, password }) => hash === `hashed:${password}`,
      },
    },
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
    plugins: [
      ghostStaffLifecycle({
        sendPasswordResetEmail: async (email) => {
          resetEmails.push(email);
        },
      }),
      sessionCreator,
    ],
  });

  const user = (id: string) => db.user.find((row) => row.id === id)!;
  const sessionsOf = (id: string) => db.session.filter((row) => row.userId === id);
  const signIn = (id: string, password = PASSWORD) =>
    auth.api.signInEmail({ body: { email: `${id}@example.com`, password } });

  return { auth, db, resetEmails, user, sessionsOf, signIn };
}

const apiError = (status: string, code: string) => (err: unknown) => {
  const error = err as { status?: string; body?: { code?: string } };
  assert.equal(error.status, status);
  assert.equal(error.body?.code, code);
  return true;
};

describe('ghostStaffLifecycle', function () {
  describe('/sign-in/email', function () {
    it('signs in an active user and records last_seen', async function () {
      const { signIn, user, sessionsOf } = setup([{ id: 'active', status: 'active' }]);

      await signIn('active');

      assert.equal(sessionsOf('active').length, 1);
      assert.ok(user('active').last_seen instanceof Date);
      assert.equal(user('active').status, 'active');
    });

    it('signs in a warned user and sets them active', async function () {
      const { signIn, user } = setup([{ id: 'warned', status: 'warn-2' }]);

      await signIn('warned');

      assert.equal(user('warned').status, 'active');
    });

    it('refuses a locked user and emails a reset link', async function () {
      const { signIn, resetEmails, sessionsOf, user } = setup([{ id: 'locked', status: 'locked' }]);

      await assert.rejects(signIn('locked'), apiError('UNAUTHORIZED', 'PASSWORD_RESET_REQUIRED'));

      assert.deepEqual(resetEmails, ['locked@example.com']);
      assert.equal(sessionsOf('locked').length, 0);
      assert.equal(user('locked').status, 'locked');
    });

    it('emails a locked user a reset link on a wrong password, with the generic error', async function () {
      const { signIn, resetEmails } = setup([{ id: 'locked', status: 'locked' }]);

      await assert.rejects(
        signIn('locked', 'wrong'),
        apiError('UNAUTHORIZED', 'INVALID_EMAIL_OR_PASSWORD'),
      );

      assert.deepEqual(resetEmails, ['locked@example.com']);
    });

    it('refuses an inactive user with the right password as suspended, without an email', async function () {
      const { signIn, resetEmails, sessionsOf } = setup([{ id: 'inactive', status: 'inactive' }]);

      await assert.rejects(signIn('inactive'), (err: { body?: { message?: string } }) => {
        apiError('FORBIDDEN', 'ACCOUNT_SUSPENDED')(err);
        assert.equal(err.body?.message, 'Your account was suspended.');
        return true;
      });

      assert.deepEqual(resetEmails, []);
      assert.equal(sessionsOf('inactive').length, 0);
    });

    it('answers an unknown email, a wrong password and a suspended user alike', async function () {
      const { signIn, user, resetEmails } = setup([
        { id: 'active', status: 'active' },
        { id: 'inactive', status: 'inactive' },
      ]);
      const failure = async (attempt: Promise<unknown>) => {
        const err = (await attempt.then(
          () => assert.fail('signed in'),
          (e: unknown) => e,
        )) as { status?: string; body?: unknown };
        return { status: err.status, body: err.body };
      };

      const unknown = await failure(signIn('nobody'));
      assert.equal(unknown.status, 'UNAUTHORIZED');
      assert.equal((unknown.body as { code?: string }).code, 'INVALID_EMAIL_OR_PASSWORD');
      assert.deepEqual(await failure(signIn('active', 'wrong')), unknown);
      assert.deepEqual(await failure(signIn('inactive', 'wrong')), unknown);

      assert.equal(user('active').last_seen, null);
      assert.deepEqual(resetEmails, []);
    });
  });

  describe('passwordless sign-in', function () {
    const magicLink = (auth: ReturnType<typeof setup>['auth'], userId: string) =>
      auth.api.magicLinkVerify({ body: { userId } });

    it('signs in an active user', async function () {
      const { auth, sessionsOf, user } = setup([{ id: 'active', status: 'active' }]);

      await magicLink(auth, 'active');

      assert.equal(sessionsOf('active').length, 1);
      assert.ok(user('active').last_seen instanceof Date);
    });

    it('unlocks a locked user', async function () {
      const { auth, sessionsOf, user, resetEmails } = setup([{ id: 'locked', status: 'locked' }]);

      await magicLink(auth, 'locked');

      assert.equal(sessionsOf('locked').length, 1);
      assert.equal(user('locked').status, 'active');
      assert.deepEqual(resetEmails, []);
    });

    it('refuses an inactive user', async function () {
      const { auth, sessionsOf, user } = setup([{ id: 'inactive', status: 'inactive' }]);

      await assert.rejects(magicLink(auth, 'inactive'), apiError('FORBIDDEN', 'ACCOUNT_SUSPENDED'));

      assert.equal(sessionsOf('inactive').length, 0);
      assert.equal(user('inactive').status, 'inactive');
    });
  });

  describe('session guard', function () {
    it('refuses a locked user on any other path', async function () {
      const { auth, sessionsOf, user } = setup([{ id: 'locked', status: 'locked' }]);

      await assert.rejects(
        auth.api.otherSignIn({ body: { userId: 'locked' } }),
        apiError('UNAUTHORIZED', 'PASSWORD_RESET_REQUIRED'),
      );

      assert.equal(sessionsOf('locked').length, 0);
      assert.equal(user('locked').status, 'locked');
    });

    it('refuses an inactive user on any other path', async function () {
      const { auth, sessionsOf } = setup([{ id: 'inactive', status: 'inactive' }]);

      await assert.rejects(
        auth.api.otherSignIn({ body: { userId: 'inactive' } }),
        apiError('FORBIDDEN', 'ACCOUNT_SUSPENDED'),
      );
      assert.equal(sessionsOf('inactive').length, 0);
    });
  });

  describe('after a session', function () {
    it('keeps a suspension that lands before the status update', async function () {
      const { auth, user } = setup([{ id: 'warned', status: 'warn-1' }]);
      const ctx = await auth.$context;

      // The after-hook waits for the commit, after the guard read `warn-1`
      await runWithTransaction(ctx.adapter, async () => {
        await ctx.internalAdapter.createSession('warned');
        user('warned').status = 'inactive';
      });

      assert.equal(user('warned').status, 'inactive');
      assert.ok(user('warned').last_seen instanceof Date);
    });
  });

  describe('createVerifiedSession', function () {
    it('creates a verified session with its cookie', async function () {
      const { auth, sessionsOf, user } = setup([{ id: 'active', status: 'active' }]);

      const { headers } = await auth.api.createVerifiedSession({
        body: { userId: 'active', origin: 'http://localhost:2368' },
        returnHeaders: true,
      });

      const [session] = sessionsOf('active');
      assert.equal(session.verified, true);
      assert.equal(session.origin, 'http://localhost:2368');
      assert.match(headers.get('set-cookie') ?? '', new RegExp(`=${session.token}\\.`));
      assert.ok(user('active').last_seen instanceof Date);
    });

    it('refuses a non-active user', async function () {
      const { auth, sessionsOf } = setup([
        { id: 'locked', status: 'locked' },
        { id: 'inactive', status: 'inactive' },
      ]);

      await assert.rejects(
        auth.api.createVerifiedSession({ body: { userId: 'locked' } }),
        apiError('UNAUTHORIZED', 'PASSWORD_RESET_REQUIRED'),
      );
      await assert.rejects(
        auth.api.createVerifiedSession({ body: { userId: 'inactive' } }),
        apiError('FORBIDDEN', 'ACCOUNT_SUSPENDED'),
      );
      assert.equal(sessionsOf('locked').length + sessionsOf('inactive').length, 0);
    });

    it('refuses an unknown user', async function () {
      const { auth } = setup([]);

      await assert.rejects(
        auth.api.createVerifiedSession({ body: { userId: 'nobody' } }),
        apiError('NOT_FOUND', 'USER_NOT_FOUND'),
      );
    });

    it('is not served over HTTP', async function () {
      const { auth } = setup([{ id: 'active', status: 'active' }]);

      const response = await auth.handler(
        new Request('http://localhost:2368/api/auth/create-verified-session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId: 'active' }),
        }),
      );

      assert.equal(response.status, 404);
    });
  });

  describe('revocation', function () {
    it('revokes one user’s sessions', async function () {
      const { auth, signIn, sessionsOf } = setup([
        { id: 'a', status: 'active' },
        { id: 'b', status: 'active' },
      ]);
      await signIn('a');
      await signIn('a');
      await signIn('b');

      await auth.api.revokeUserSessions({ body: { userId: 'a' } });

      assert.equal(sessionsOf('a').length, 0);
      assert.equal(sessionsOf('b').length, 1);
    });

    it('revokes every session', async function () {
      const { auth, signIn, db } = setup([
        { id: 'a', status: 'active' },
        { id: 'b', status: 'active' },
      ]);
      await signIn('a');
      await signIn('b');

      await auth.api.revokeAllSessions();

      assert.equal(db.session.length, 0);
    });
  });

  describe('lockAllUsers', function () {
    it('locks every user but the suspended, and replaces every password', async function () {
      const { auth, db, user, signIn, resetEmails } = setup([
        { id: 'active', status: 'active' },
        { id: 'warned', status: 'warn-1' },
        { id: 'locked', status: 'locked' },
        { id: 'inactive', status: 'inactive' },
      ]);

      const result = await auth.api.lockAllUsers();

      assert.equal(result.count, 4);
      assert.equal(user('active').status, 'locked');
      assert.equal(user('warned').status, 'locked');
      assert.equal(user('locked').status, 'locked');
      assert.equal(user('inactive').status, 'inactive');
      for (const account of db.account) {
        assert.notEqual(account.password, `hashed:${PASSWORD}`);
      }
      await assert.rejects(signIn('active'), apiError('UNAUTHORIZED', 'INVALID_EMAIL_OR_PASSWORD'));
      assert.deepEqual(resetEmails, ['active@example.com']);
    });
  });
});
