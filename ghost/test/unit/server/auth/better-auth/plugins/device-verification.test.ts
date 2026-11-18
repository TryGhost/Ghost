import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sinon from 'sinon';
import { betterAuth } from 'better-auth/minimal';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import { z } from 'zod';
import {
  DEVICE_TRUST_COOKIE,
  ghostDeviceVerification,
  verifiesNewSession,
  type DeviceVerificationCode,
} from '../../../../../../core/server/auth/better-auth/plugins/device-verification';

type Row = Record<string, unknown>;

const PASSWORD = 'correct horse battery staple';
const ORIGIN = 'http://localhost:2368';
const DEVICE_COOKIE = 'ghost-admin-device';

// A passwordless sign-in path and a session-protected endpoint
const testEndpoints = {
  id: 'test-endpoints',
  endpoints: {
    magicLinkVerify: createAuthEndpoint(
      '/magic-link/verify',
      { method: 'POST', body: z.object({ userId: z.string() }) },
      async (ctx) => ctx.json(await ctx.context.internalAdapter.createSession(ctx.body.userId)),
    ),
    whoami: createAuthEndpoint(
      '/test/whoami',
      { method: 'GET', use: [sessionMiddleware] },
      async (ctx) => ctx.json({ userId: ctx.context.session.user.id }),
    ),
  },
} satisfies BetterAuthPlugin;

function setup({
  lastSeen = new Date(),
  enabled = true,
  emailMfa = false,
  emailAllowed = true,
}: { lastSeen?: Date | null; enabled?: boolean; emailMfa?: boolean; emailAllowed?: boolean } = {}) {
  const now = new Date();
  const ids = ['staff', 'other'];
  const db: Record<string, Row[]> = {
    user: ids.map((id) => ({
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: true,
      last_seen: lastSeen,
      createdAt: now,
      updatedAt: now,
    })),
    account: ids.map((id) => ({
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
  const sent: DeviceVerificationCode[] = [];
  const limiterResets: string[] = [];
  const state = { emailMfa };

  const options = {
    isEnabled: () => enabled,
    isEmailMfaRequired: () => state.emailMfa,
    emailLimiter: () => ({
      consume: async () =>
        emailAllowed
          ? ({ allowed: true } as const)
          : ({ allowed: false, retryAfterMs: 60_000 } as const),
      reset: async ({ key }: { key?: string }) => {
        limiterResets.push(key!);
      },
    }),
    sendCode: async (message: DeviceVerificationCode) => {
      sent.push(message);
    },
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
      additionalFields: { last_seen: { type: 'date', required: false, input: false } },
    },
    session: {
      additionalFields: { verified: { type: 'boolean', defaultValue: false, input: false } },
    },
    // As createAuth's hook, minus the rotation and origin rules it tests itself
    databaseHooks: {
      session: {
        create: {
          async before(session, ctx) {
            if (!enabled || (ctx && (await verifiesNewSession(session, ctx, options)))) {
              return { data: { verified: true } };
            }
          },
        },
      },
    },
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
    logger: { disabled: true },
    advanced: { cookies: { [DEVICE_TRUST_COOKIE]: { name: DEVICE_COOKIE } } },
    plugins: [ghostDeviceVerification(options), testEndpoints],
  });

  // A browser: requests carry the cookies earlier responses set
  const jar = new Map<string, string>();
  async function request(path: string, init: { method?: string; body?: unknown } = {}) {
    const response = await auth.handler(
      new Request(`${ORIGIN}/api/auth${path}`, {
        method: init.method ?? (init.body ? 'POST' : 'GET'),
        headers: {
          origin: ORIGIN,
          'content-type': 'application/json',
          cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
      }),
    );
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, value] = [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)];
      if (value && !/max-age=0/i.test(cookie)) {
        jar.set(name, value);
      } else {
        jar.delete(name);
      }
    }
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  const signIn = (id = 'staff', body: Row = {}) =>
    request('/sign-in/email', {
      body: { email: `${id}@example.com`, password: PASSWORD, ...body },
    });
  const verify = (code: string) => request('/device-verification/verify', { body: { code } });
  const sessionsOf = (id: string) => db.session.filter((row) => row.userId === id);
  const lastCode = () => sent.at(-1)!.code;

  return {
    auth,
    db,
    jar,
    sent,
    state,
    limiterResets,
    request,
    signIn,
    verify,
    sessionsOf,
    lastCode,
  };
}

describe('ghostDeviceVerification', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('sign-in', function () {
    it('emails a code and answers 2FA_NEW_DEVICE_DETECTED for a new device', async function () {
      const { signIn, sent, db, jar, sessionsOf } = setup();

      const response = await signIn();

      assert.equal(response.status, 403);
      assert.equal(response.body.code, '2FA_NEW_DEVICE_DETECTED');
      assert.equal(sent.length, 1);
      assert.equal(sent[0].email, 'staff@example.com');
      assert.match(sent[0].code, /^\d{6}$/);
      assert.equal(sent[0].isEmailMfaRequired, false);
      // The unverified session's cookie is kept, so the browser can verify it
      assert.ok(jar.has('better-auth.session_token'));
      const [session] = sessionsOf('staff');
      assert.equal(session.verified, false);
      // Stored hashed, for this session only
      assert.equal(db.verification.length, 1);
      assert.equal(db.verification[0].identifier, `device-verification:${session.id}`);
      assert.notEqual(db.verification[0].value, sent[0].code);
      assert.equal(db.verification[0].attempts, 0);
    });

    it('answers 2FA_TOKEN_REQUIRED when require_email_mfa is on', async function () {
      const { signIn, sent } = setup({ emailMfa: true });

      const response = await signIn();

      assert.equal(response.status, 403);
      assert.equal(response.body.code, '2FA_TOKEN_REQUIRED');
      assert.equal(sent[0].isEmailMfaRequired, true);
    });

    it('verifies a first login, even with require_email_mfa on', async function () {
      const { signIn, sent, sessionsOf } = setup({ lastSeen: null, emailMfa: true });

      const response = await signIn();

      assert.equal(response.status, 200);
      assert.equal(sessionsOf('staff')[0].verified, true);
      assert.equal(sent.length, 0);
    });

    it('verifies every session when device verification is off', async function () {
      const { signIn, sent, jar } = setup({ enabled: false });

      assert.equal((await signIn()).status, 200);
      assert.equal(sent.length, 0);
      assert.equal(jar.has(DEVICE_COOKIE), false);
    });

    it('treats a magic link as verified', async function () {
      const { auth, sent, sessionsOf } = setup({ emailMfa: true });

      await auth.api.magicLinkVerify({ body: { userId: 'staff' }, headers: new Headers() });

      assert.equal(sessionsOf('staff')[0].verified, true);
      assert.equal(sent.length, 0);
    });

    it('verifies with a valid inline token and replaces the unverified session', async function () {
      const { signIn, sessionsOf, lastCode, db, limiterResets } = setup();
      await signIn();
      const [unverified] = sessionsOf('staff');

      const response = await signIn('staff', { token: lastCode() });

      assert.equal(response.status, 200);
      const sessions = sessionsOf('staff');
      assert.equal(sessions.length, 1);
      assert.notEqual(sessions[0].id, unverified.id);
      assert.equal(sessions[0].verified, true);
      assert.equal(db.verification.length, 0);
      // As /device-verification/verify, a verified code restores the email budget
      assert.deepEqual(limiterResets, ['staff']);
    });

    it('sends a new code for a wrong inline token', async function () {
      const { signIn, sent, lastCode, sessionsOf } = setup();
      await signIn();
      const wrong = lastCode() === '000000' ? '000001' : '000000';

      const response = await signIn('staff', { token: wrong });

      assert.equal(response.status, 403);
      assert.equal(sent.length, 2);
      assert.equal(sessionsOf('staff').length, 1);
    });

    it("ignores an inline token from another user's session", async function () {
      const { signIn, lastCode, sessionsOf } = setup();
      await signIn('other');

      const response = await signIn('staff', { token: lastCode() });

      assert.equal(response.status, 403);
      assert.equal(sessionsOf('staff')[0].verified, false);
    });
  });

  describe('device-trust cookie', function () {
    async function trustedBrowser(options: Parameters<typeof setup>[0] = {}) {
      const harness = setup(options);
      await harness.signIn();
      assert.equal((await harness.verify(harness.lastCode())).status, 200);
      assert.ok(harness.jar.has(DEVICE_COOKIE));
      await harness.request('/sign-out', { body: {} });
      return harness;
    }

    it('verifies the next sign-in from a trusted browser', async function () {
      const { signIn, sent } = await trustedBrowser();

      const response = await signIn();

      assert.equal(response.status, 200);
      assert.equal(sent.length, 1);
    });

    it('is not honoured when require_email_mfa is on', async function () {
      const { signIn, state, jar } = await trustedBrowser();
      state.emailMfa = true;
      assert.ok(jar.has(DEVICE_COOKIE));

      assert.equal((await signIn()).status, 403);
    });

    it('is bound to the user', async function () {
      const { signIn } = await trustedBrowser();

      assert.equal((await signIn('other')).status, 403);
    });

    it('is refused when tampered with', async function () {
      const { signIn, jar } = await trustedBrowser();
      jar.set(DEVICE_COOKIE, jar.get(DEVICE_COOKIE)!.replace(/^staff\./, 'other.'));

      assert.equal((await signIn('other')).status, 403);
    });

    it('is refused once expired, even if the browser kept it', async function () {
      const { signIn, jar } = await trustedBrowser();
      const expiresAt = Number(jar.get(DEVICE_COOKIE)!.split('.')[1]);
      const clock = sinon.useFakeTimers({ now: (expiresAt + 1) * 1000, toFake: ['Date'] });

      try {
        assert.ok(jar.has(DEVICE_COOKIE));
        assert.equal((await signIn()).status, 403);
      } finally {
        clock.restore();
      }
    });

    it('is refused when its expiry is extended', async function () {
      const { signIn, jar } = await trustedBrowser();
      const [userId, expiresAt, signature] = jar.get(DEVICE_COOKIE)!.split('.');
      jar.set(DEVICE_COOKIE, `${userId}.${Number(expiresAt) + 60}.${signature}`);

      assert.equal((await signIn()).status, 403);
    });

    it('is not set when require_email_mfa is on, and sign-out clears it', async function () {
      const harness = setup({ emailMfa: true });
      await harness.signIn();
      await harness.verify(harness.lastCode());
      assert.equal(harness.jar.has(DEVICE_COOKIE), false);

      harness.jar.set(DEVICE_COOKIE, 'left-over');
      await harness.request('/sign-out', { body: {} });

      assert.equal(harness.jar.has(DEVICE_COOKIE), false);
    });
  });

  describe('/device-verification/verify', function () {
    it('verifies the session and resets the email limit', async function () {
      const { signIn, verify, lastCode, sessionsOf, limiterResets, db } = setup();
      await signIn();

      const response = await verify(lastCode());

      assert.equal(response.status, 200);
      assert.equal(sessionsOf('staff')[0].verified, true);
      assert.deepEqual(limiterResets, ['staff']);
      assert.equal(db.verification.length, 0);
    });

    it('refuses a wrong code and counts the attempt', async function () {
      const { signIn, verify, lastCode, db, sessionsOf } = setup();
      await signIn();
      const wrong = lastCode() === '000000' ? '000001' : '000000';

      const response = await verify(wrong);

      assert.equal(response.status, 401);
      assert.equal(response.body.code, 'INVALID_CODE');
      assert.equal(db.verification[0].attempts, 1);
      assert.equal(sessionsOf('staff')[0].verified, false);
    });

    it('caps a code at five wrong attempts, including an inline sign-in', async function () {
      const { signIn, verify, lastCode, db, sent } = setup();
      await signIn();
      const code = lastCode();
      const wrong = code === '000000' ? '000001' : '000000';

      for (let attempt = 0; attempt < 5; attempt++) {
        assert.equal((await verify(wrong)).status, 401);
      }
      const sixth = await verify(code);

      assert.equal(sixth.status, 429);
      assert.equal(sixth.body.code, 'TOO_MANY_ATTEMPTS');
      assert.equal(db.verification.length, 1);
      assert.equal(db.verification[0].attempts, 5);

      // Signing in again with it refuses, rather than sending a new code
      const inline = await signIn('staff', { token: code });
      assert.equal(inline.status, 429);
      assert.equal(inline.body.code, 'TOO_MANY_ATTEMPTS');
      assert.equal(sent.length, 1);
    });

    it('lifts the cap when a new code is sent', async function () {
      const { signIn, verify, lastCode, request } = setup();
      await signIn();
      const wrong = lastCode() === '000000' ? '000001' : '000000';
      for (let attempt = 0; attempt < 5; attempt++) {
        await verify(wrong);
      }

      assert.equal((await request('/device-verification/send', { body: {} })).status, 200);

      assert.equal((await verify(lastCode())).status, 200);
    });

    it('lifts the cap when the code expires', async function () {
      const { signIn, verify, lastCode, db, sent } = setup();
      await signIn();
      const code = lastCode();
      const wrong = code === '000000' ? '000001' : '000000';
      for (let attempt = 0; attempt < 5; attempt++) {
        await verify(wrong);
      }
      db.verification[0].expiresAt = new Date(Date.now() - 1000);

      assert.equal((await verify(code)).status, 401);
      assert.equal((await signIn('staff', { token: code })).status, 403);
      assert.equal(sent.length, 2);
    });

    it('refuses an expired code', async function () {
      const { signIn, verify, lastCode, db } = setup();
      await signIn();
      db.verification[0].expiresAt = new Date(Date.now() - 1000);

      assert.equal((await verify(lastCode())).status, 401);
      assert.equal(db.verification.length, 0);
    });

    it("refuses another session's code", async function () {
      // Distinct codes, so the second session's can't match by chance
      const randomInt = sinon.stub(crypto, 'randomInt') as unknown as sinon.SinonStub<
        [number, number],
        number
      >;
      randomInt.onFirstCall().returns(111111).onSecondCall().returns(222222);
      const first = setup();
      await first.signIn();
      const code = first.lastCode();
      // A second browser signs in as the same user
      first.jar.clear();
      await first.signIn();

      assert.equal(code, '111111');
      assert.equal(first.lastCode(), '222222');
      assert.equal((await first.verify(code)).status, 401);
    });

    it('needs a session', async function () {
      const { verify } = setup();

      assert.equal((await verify('123456')).status, 401);
    });
  });

  describe('/device-verification/send', function () {
    it('replaces the code with a new one', async function () {
      const { signIn, request, sent, verify, db } = setup();
      await signIn();
      const first = sent[0].code;

      assert.equal((await request('/device-verification/send', { body: {} })).status, 200);

      assert.equal(sent.length, 2);
      assert.equal(db.verification.length, 1);
      if (first !== sent[1].code) {
        assert.equal((await verify(first)).status, 401);
      }
      assert.equal((await verify(sent[1].code)).status, 200);
    });

    it('refuses once the email limit is reached', async function () {
      const { signIn, request, sent } = setup({ emailAllowed: false });

      const signInResponse = await signIn();
      assert.equal(signInResponse.status, 429);
      const response = await request('/device-verification/send', { body: {} });

      assert.equal(response.status, 429);
      assert.equal(response.body.code, 'TOO_MANY_VERIFICATION_EMAILS');
      assert.equal(sent.length, 0);
    });
  });

  describe('unverified-session gate', function () {
    it('treats an unverified session as anonymous on protected endpoints', async function () {
      const { signIn, request } = setup();
      await signIn();

      assert.equal((await request('/test/whoami')).status, 401);
      assert.equal((await request('/list-sessions')).status, 401);
      assert.equal((await request('/get-session')).body, null);
    });

    it('admits the session once verified', async function () {
      const { signIn, request, verify, lastCode } = setup();
      await signIn();
      await verify(lastCode());

      const response = await request('/test/whoami');

      assert.equal(response.status, 200);
      assert.equal(response.body.userId, 'staff');
    });

    it('lets an unverified session sign out', async function () {
      const { signIn, request, sessionsOf } = setup();
      await signIn();

      assert.equal((await request('/sign-out', { body: {} })).status, 200);
      assert.equal(sessionsOf('staff').length, 0);
    });
  });
});
