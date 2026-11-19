import assert from 'node:assert/strict';
import { betterAuth } from 'better-auth/minimal';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import { ghostSessionGate } from '../../../../../../core/server/auth/better-auth/plugins/session-gate';

type Row = Record<string, unknown>;

const PASSWORD = 'correct horse battery staple';
const ORIGIN = 'http://localhost:2368';
const SESSION_COOKIE = 'better-auth.session_token';
// Decodes outside Latin-1, which Headers rejects; and a plain encoded value
const OTHER_COOKIES = 'pref=%F0%9F%98%80; other=a%20b';

// Report what reached the endpoint
const probes = {
  id: 'test-probes',
  endpoints: {
    cookies: createAuthEndpoint('/test/cookies', { method: 'GET' }, async (ctx) =>
      ctx.json({ cookie: ctx.headers?.get('cookie') ?? null }),
    ),
    // A path an unverified session may still use
    deviceCookies: createAuthEndpoint(
      '/device-verification/test-cookies',
      { method: 'GET' },
      async (ctx) => ctx.json({ cookie: ctx.headers?.get('cookie') ?? null }),
    ),
    whoami: createAuthEndpoint(
      '/test/whoami',
      { method: 'GET', use: [sessionMiddleware] },
      async (ctx) => ctx.json({ userId: ctx.context.session.user.id }),
    ),
  },
} satisfies BetterAuthPlugin;

function setup({ verified = true }: { verified?: boolean } = {}) {
  const now = new Date();
  const db: Record<string, Row[]> = {
    user: [
      {
        id: 'staff',
        status: 'active',
        name: 'staff',
        email: 'staff@example.com',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    account: [
      {
        id: 'account-staff',
        userId: 'staff',
        accountId: 'staff',
        providerId: 'credential',
        password: `hashed:${PASSWORD}`,
        createdAt: now,
        updatedAt: now,
      },
    ],
    session: [],
    verification: [],
  };

  const auth = betterAuth({
    baseURL: ORIGIN,
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
      additionalFields: { status: { type: 'string', required: false, input: false } },
    },
    session: {
      additionalFields: { verified: { type: 'boolean', defaultValue: false, input: false } },
    },
    databaseHooks: {
      session: { create: { before: async () => ({ data: { verified } }) } },
    },
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
    logger: { disabled: true },
    plugins: [ghostSessionGate(), probes],
  });

  async function signIn() {
    const { headers } = await auth.api.signInEmail({
      body: { email: 'staff@example.com', password: PASSWORD },
      returnHeaders: true,
    });
    const session = (headers.get('set-cookie') ?? '').split(';')[0];
    assert.ok(session.startsWith(`${SESSION_COOKIE}=`));
    return session;
  }

  const get = async (path: string, cookie: string) => {
    const response = await auth.handler(
      new Request(`${ORIGIN}/api/auth${path}`, { headers: { cookie } }),
    );
    return { status: response.status, body: await response.json() };
  };

  return { auth, db, signIn, get, user: () => db.user[0] };
}

describe('ghostSessionGate', function () {
  it('passes an active, verified session through with the header as sent', async function () {
    const { signIn, get } = setup();
    const cookie = `${OTHER_COOKIES}; ${await signIn()}`;

    assert.deepEqual((await get('/test/cookies', cookie)).body, { cookie });
    assert.deepEqual((await get('/test/whoami', cookie)).body, { userId: 'staff' });
  });

  for (const status of ['inactive', 'locked']) {
    it(`deletes the session of a user who is now ${status}, keeping other cookies as sent`, async function () {
      const { signIn, get, db, user } = setup();
      const session = await signIn();
      user().status = status;

      const reached = await get('/test/cookies', `pref=%F0%9F%98%80; ${session}; other=a%20b`);

      assert.equal(reached.status, 200);
      assert.deepEqual(reached.body, { cookie: OTHER_COOKIES });
      assert.equal(db.session.length, 0);
      assert.equal((await get('/test/whoami', session)).status, 401);
    });
  }

  it("refuses a password change on a suspended user's surviving session", async function () {
    const { auth, signIn, db, user } = setup();
    const headers = new Headers({ cookie: await signIn() });
    user().status = 'inactive';

    await assert.rejects(
      auth.api.changePassword({
        body: { currentPassword: PASSWORD, newPassword: 'a new password' },
        headers,
      }),
      (err: { status?: string }) => err.status === 'UNAUTHORIZED',
    );

    assert.equal(db.account[0].password, `hashed:${PASSWORD}`);
    assert.equal(db.session.length, 0);
  });

  it('makes an unverified session anonymous, but keeps it', async function () {
    const { signIn, get, db } = setup({ verified: false });
    const session = await signIn();

    const reached = await get('/test/cookies', `${OTHER_COOKIES}; ${session}`);

    assert.deepEqual(reached.body, { cookie: OTHER_COOKIES });
    assert.equal((await get('/test/whoami', session)).status, 401);
    assert.equal(db.session.length, 1);
  });

  it('lets an unverified session reach device verification', async function () {
    const { signIn, get } = setup({ verified: false });
    const cookie = `${OTHER_COOKIES}; ${await signIn()}`;

    assert.deepEqual((await get('/device-verification/test-cookies', cookie)).body, { cookie });
  });

  it('deletes an unverified session whose user is suspended, even on device verification', async function () {
    const { signIn, get, db, user } = setup({ verified: false });
    const session = await signIn();
    user().status = 'inactive';

    const reached = await get('/device-verification/test-cookies', `${OTHER_COOKIES}; ${session}`);

    assert.deepEqual(reached.body, { cookie: OTHER_COOKIES });
    assert.equal(db.session.length, 0);
  });

  it('leaves a request without a session cookie alone', async function () {
    const { get } = setup();

    assert.deepEqual((await get('/test/cookies', OTHER_COOKIES)).body, { cookie: OTHER_COOKIES });
  });
});
