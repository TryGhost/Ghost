import assert from 'node:assert/strict';
import sinon from 'sinon';
import request from 'supertest';
const {
  startGhost,
  fixtureManager,
  configUtils,
  mockManager,
  resetRateLimits,
} = require('../utils/e2e-framework');
const auth = require('../../core/server/auth');
const db = require('../../core/server/data/db');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');
const DataGenerator = require('../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

const [owner, editor] = DataGenerator.Content.users;
const SUBJECT = /^(\d{6}) is your Ghost sign in verification code$/;

// Native sign-in with staff device verification on (plan §3.3, §5.4)
describe.skipIf(isSQLite)('ghostDeviceVerification under auth:engine better-auth', function () {
  const sandbox = sinon.createSandbox();
  const adminOrigin = 'http://localhost:2369';
  const host = new URL(adminOrigin).host;
  let app: Parameters<typeof request>[0];

  // One browser's cookies
  class Browser {
    cookies = new Map<string, string>();

    header() {
      return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    }

    async send(method: 'get' | 'post', path: string, body?: object) {
      const agent = request(app);
      const response = await (method === 'get' ? agent.get(path) : agent.post(path))
        .set('Host', host)
        .set('Origin', adminOrigin)
        .set('Cookie', this.header())
        .send(body);
      for (const cookie of [response.headers['set-cookie'] ?? []].flat() as string[]) {
        const [pair] = cookie.split(';');
        const name = pair.slice(0, pair.indexOf('='));
        const value = pair.slice(pair.indexOf('=') + 1);
        if (value && !/max-age=0/i.test(cookie)) {
          this.cookies.set(name, value);
        } else {
          this.cookies.delete(name);
        }
      }
      return response;
    }

    auth(path: string, body: object = {}) {
      return this.send('post', `/ghost/api/admin/auth${path}`, body);
    }

    signIn(user: { email: string; password: string }, extra: object = {}) {
      return this.auth('/sign-in/email', { email: user.email, password: user.password, ...extra });
    }

    me() {
      return this.send('get', '/ghost/api/admin/users/me/');
    }
  }

  async function expectStatus(pending: Promise<request.Response>, status: number) {
    const response = await pending;
    assert.equal(response.status, status, JSON.stringify(response.body));
    return response;
  }

  // Codes are emailed before the response, so the next email is this request's
  let emailsSeen = 0;
  function nextCode(to: string) {
    const sent = mockManager.assert.sentEmail({ to, subject: SUBJECT });
    emailsSeen += 1;
    return SUBJECT.exec(sent.subject)![1];
  }

  const api = () => auth.betterAuth.instance.api;
  const sessionsOf = (userId: string) => db.knex('user_sessions').where({ user_id: userId });
  const codesOf = async (userId: string) =>
    db.knex('verifications').whereIn(
      'identifier',
      (await sessionsOf(userId)).map((s: { id: string }) => `device-verification:${s.id}`),
    );

  beforeAll(async function () {
    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    configUtils.set('auth:engine', 'better-auth');
    configUtils.set('url', `${adminOrigin}/`);

    app = await startGhost({ backend: true, frontend: false, server: false });
    await fixtureManager.init('users');
  });

  beforeEach(async function () {
    // mockManager.restore() restores config after each test
    configUtils.set('url', `${adminOrigin}/`);
    configUtils.set('security:staffDeviceVerification', true);
    await resetRateLimits();
    await db.knex('user_sessions').del();
    await db.knex('verifications').del();
    // Not a first login unless a test says so
    await db.knex('users').update({ status: 'active', last_seen: new Date() });
    mockManager.mockMail();
    emailsSeen = 0;
  });

  afterEach(async function () {
    mockManager.restore();
    await configUtils.restore();
  });

  afterAll(async function () {
    sandbox.restore();
    try {
      await jobsService.shutdown();
    } finally {
      await stripe.shutdown();
      await configUtils.restore();
    }
  });

  it('emails a code for a new device and treats the session as anonymous until verified', async function () {
    const browser = new Browser();

    const signIn = await expectStatus(browser.signIn(owner), 403);

    assert.equal(signIn.body.code, '2FA_NEW_DEVICE_DETECTED');
    const code = nextCode(owner.email);
    const [session] = await sessionsOf(owner.id);
    assert.equal(session.verified, 0);
    const [row] = await codesOf(owner.id);
    assert.equal(row.attempts, 0);
    assert.notEqual(row.value, code);
    assert.ok(new Date(row.expires_at).getTime() <= Date.now() + 5 * 60 * 1000);

    await expectStatus(browser.me(), 403);
    // The gate: protected Better Auth endpoints don't see the session
    await expectStatus(
      browser.auth('/change-password', {
        currentPassword: owner.password,
        newPassword: owner.password,
      }),
      401,
    );

    await expectStatus(browser.auth('/device-verification/verify', { code }), 200);

    assert.equal((await sessionsOf(owner.id))[0].verified, 1);
    assert.ok(browser.cookies.has('ghost-admin-device'));
    await expectStatus(browser.me(), 200);
  });

  it('trusts a verified browser on its next sign-in', async function () {
    const browser = new Browser();
    await expectStatus(browser.signIn(owner), 403);
    await expectStatus(
      browser.auth('/device-verification/verify', { code: nextCode(owner.email) }),
      200,
    );
    await expectStatus(browser.auth('/sign-out'), 200);

    await expectStatus(browser.signIn(owner), 200);

    await expectStatus(browser.me(), 200);
    mockManager.assert.sentEmailCount(emailsSeen);
  });

  it('asks for a code every time when require_email_mfa is on', async function () {
    const browser = new Browser();
    await expectStatus(browser.signIn(owner), 403);
    await browser.auth('/device-verification/verify', { code: nextCode(owner.email) });
    assert.ok(browser.cookies.has('ghost-admin-device'));

    mockManager.mockSetting('require_email_mfa', true);
    const response = await expectStatus(browser.signIn(owner), 403);
    assert.equal(response.body.code, '2FA_TOKEN_REQUIRED');
    nextCode(owner.email);

    await expectStatus(browser.auth('/sign-out'), 200);
    assert.equal(browser.cookies.has('ghost-admin-device'), false);
  });

  it('skips verification on a first login, even with require_email_mfa on', async function () {
    mockManager.mockSetting('require_email_mfa', true);
    await db.knex('users').where({ id: editor.id }).update({ last_seen: null });

    await expectStatus(new Browser().signIn(editor), 200);

    assert.equal((await sessionsOf(editor.id))[0].verified, 1);
    mockManager.assert.sentEmailCount(0);
  });

  it('verifies a sign-in that carries the code inline', async function () {
    const browser = new Browser();
    await expectStatus(browser.signIn(owner), 403);
    const code = nextCode(owner.email);

    await expectStatus(browser.signIn(owner, { token: code }), 200);

    const sessions = await sessionsOf(owner.id);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].verified, 1);
    await expectStatus(browser.me(), 200);
  });

  it('counts concurrent wrong codes atomically and caps the code', async function () {
    const browser = new Browser();
    await expectStatus(browser.signIn(owner), 403);
    const code = nextCode(owner.email);
    const wrong = code === '000000' ? '000001' : '000000';

    // Server-side calls skip Ghost's per-IP limiter, which would stop the fifth request
    const headers = new Headers({ cookie: browser.header(), origin: adminOrigin });
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => api().verifyDevice({ body: { code: wrong }, headers })),
    );

    const codes = results.map((r) =>
      r.status === 'rejected' ? (r.reason as { body?: { code?: string } }).body?.code : 'ok',
    );
    assert.ok(
      codes.every((c) => c === 'INVALID_CODE' || c === 'TOO_MANY_ATTEMPTS'),
      codes.join(),
    );
    // Only five attempts count; the code then refuses every try until resent
    assert.equal(codes.filter((c) => c === 'INVALID_CODE').length, 5, codes.join());
    const [row] = await codesOf(owner.id);
    assert.equal(row.attempts, 5);
    await assert.rejects(api().verifyDevice({ body: { code }, headers }), {
      body: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many verification attempts. Please request a new code.',
      },
    });
    // The inline token, which signInEmail's body type leaves out
    const inline = { email: owner.email, password: owner.password, token: code };
    await assert.rejects(api().signInEmail({ body: inline, headers }), {
      body: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many verification attempts. Please request a new code.',
      },
    });
    mockManager.assert.sentEmailCount(emailsSeen);
  });

  it("counts /device-verification/verify against Ghost's verification limiter", async function () {
    const browser = new Browser();
    await expectStatus(browser.signIn(owner), 403);
    const code = nextCode(owner.email);
    const wrong = code === '000000' ? '000001' : '000000';

    for (let attempt = 0; attempt < 4; attempt++) {
      await expectStatus(browser.auth('/device-verification/verify', { code: wrong }), 401);
    }
    // A fresh code has attempts left, but this IP has used its free retries
    await expectStatus(browser.auth('/device-verification/send'), 200);
    const fresh = nextCode(owner.email);
    const wrongFresh = fresh === '000000' ? '000001' : '000000';
    await expectStatus(browser.auth('/device-verification/verify', { code: wrongFresh }), 401);

    const blocked = await expectStatus(
      browser.auth('/device-verification/verify', { code: fresh }),
      429,
    );
    assert.equal(blocked.body.code, undefined);
  });

  it('keeps one live code after concurrent sends', async function () {
    const browser = new Browser();
    await expectStatus(browser.signIn(owner), 403);
    nextCode(owner.email);

    const headers = new Headers({ cookie: browser.header(), origin: adminOrigin });
    await Promise.all([
      api().sendDeviceVerification({ headers }),
      api().sendDeviceVerification({ headers }),
    ]);

    assert.equal((await codesOf(owner.id)).length, 1);
    const codes = [nextCode(owner.email), nextCode(owner.email)];
    const statuses = [];
    for (const code of codes) {
      statuses.push((await browser.auth('/device-verification/verify', { code })).status);
    }
    assert.ok(statuses.includes(200), statuses.join());
  });

  it('sends a new code on request', async function () {
    const browser = new Browser();
    await expectStatus(browser.signIn(owner), 403);
    nextCode(owner.email);

    await expectStatus(browser.auth('/device-verification/send'), 200);

    const code = nextCode(owner.email);
    await expectStatus(browser.auth('/device-verification/verify', { code }), 200);
  });

  it('verifies every session when device verification is off', async function () {
    configUtils.set('security:staffDeviceVerification', false);

    await expectStatus(new Browser().signIn(owner), 200);

    assert.equal((await sessionsOf(owner.id))[0].verified, 1);
    mockManager.assert.sentEmailCount(0);
  });
});
