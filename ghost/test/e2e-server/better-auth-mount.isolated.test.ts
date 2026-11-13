import assert from 'node:assert/strict';
import sinon from 'sinon';
import request from 'supertest';

const {
  startGhost,
  fixtureManager,
  configUtils,
  resetRateLimits,
} = require('../utils/e2e-framework');
const db = require('../../core/server/data/db');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');
const DataGenerator = require('../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

const AUTH = '/ghost/api/admin/auth';
const owner = DataGenerator.Content.users[0];

// Native requests need a real HTTP request: Better Auth reads the body stream
describe.skipIf(isSQLite)('Better Auth native routes', function () {
  const sandbox = sinon.createSandbox();
  const siteOrigin = 'http://127.0.0.1:2369';
  const adminOrigin = 'http://localhost:2369';
  let app: Parameters<typeof request>[0];

  // With a separate admin URL, Ghost serves the API on the admin host only
  const post = (path: string) => request(app).post(path).set('Host', new URL(adminOrigin).host);

  const signIn = (origin: string, password = owner.password) =>
    post(`${AUTH}/sign-in/email`).set('Origin', origin).send({ email: owner.email, password });

  beforeAll(async function () {
    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    configUtils.set('auth:engine', 'better-auth');
    configUtils.set('createInDevelopmentTables', true);
    configUtils.set('url', `${siteOrigin}/`);
    configUtils.set('admin:url', `${adminOrigin}/`);

    app = await startGhost({ backend: true, frontend: false, server: false });
    await fixtureManager.init('users');
  });

  beforeEach(async function () {
    await resetRateLimits();
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

  it('signs in from the admin origin without returning the session token', async function () {
    const response = await signIn(adminOrigin).expect(200);

    assert.equal(response.body.user.id, owner.id);
    assert.equal(Object.hasOwn(response.body, 'token'), false);
    assert.match(response.headers['set-cookie'][0], /^ghost-admin-api-session=/);
  });

  it('marks native responses private, like the rest of the Admin API', async function () {
    const signedIn = await signIn(adminOrigin).expect(200);

    // Better Auth sets no cache header of its own here
    const sessions = await request(app)
      .get(`${AUTH}/list-sessions`)
      .set('Host', new URL(adminOrigin).host)
      .set('Origin', adminOrigin)
      .set('Cookie', signedIn.headers['set-cookie'])
      .expect(200);
    assert.match(sessions.headers['cache-control'], /\bprivate\b.*\bno-store\b/);
  });

  it('rejects a sign-in from the site origin', async function () {
    const response = await signIn(siteOrigin).expect(403);

    assert.equal(response.body.code, 'INVALID_ORIGIN');
  });

  it('returns 404 for a disabled path', async function () {
    await post(`${AUTH}/sign-up/email`)
      .set('Origin', adminOrigin)
      .send({ email: 'new@example.com', password: 'password1234', name: 'New' })
      .expect(404);
  });

  it('rate limits direct sign-ins like POST /session, sharing its limit', async function () {
    // A retry count: one request plus the retries, then blocked
    const attempts = configUtils.config.get('spam').user_login.freeRetries + 1;

    for (let i = 0; i < attempts; i++) {
      await signIn(adminOrigin, 'wrong-password').expect(401);
    }

    const blocked = await signIn(adminOrigin, 'wrong-password').expect(429);
    assert.match(blocked.headers['x-retry-after'], /^\d+$/);
    await post('/ghost/api/admin/session/')
      .set('Origin', adminOrigin)
      .send({ grant_type: 'password', username: owner.email, password: owner.password })
      .expect(429);
  });

  it('shares the global sign-in limit with POST /session', async function () {
    const attempts = configUtils.config.get('spam').global_block.freeRetries + 1;
    // Room for every sign-in here, so only globalBlock can block
    const userRetries = configUtils.config.get('spam').user_login.freeRetries;
    configUtils.set('spam:user_login:freeRetries', 2 * attempts);
    await resetRateLimits();
    onTestFinished(async () => {
      configUtils.set('spam:user_login:freeRetries', userRetries);
      await resetRateLimits();
    });

    for (let i = 0; i < attempts; i++) {
      await signIn(adminOrigin, 'wrong-password').expect(401);
    }

    await post('/ghost/api/admin/session/')
      .set('Origin', adminOrigin)
      .send({ grant_type: 'password', username: owner.email, password: owner.password })
      .expect(429);
  });

  it('clears failed sign-ins on a successful sign-in, like POST /session', async function () {
    const attempts = configUtils.config.get('spam').user_login.freeRetries + 1;
    // Room for every sign-in here, so only userLogin can block
    const globalRetries = configUtils.config.get('spam').global_block.freeRetries;
    configUtils.set('spam:global_block:freeRetries', 2 * attempts);
    await resetRateLimits();
    onTestFinished(async () => {
      configUtils.set('spam:global_block:freeRetries', globalRetries);
      await resetRateLimits();
    });

    for (let i = 0; i < attempts - 1; i++) {
      await signIn(adminOrigin, 'wrong-password').expect(401);
    }
    await signIn(adminOrigin).expect(200);

    for (let i = 0; i < attempts; i++) {
      await signIn(adminOrigin, 'wrong-password').expect(401);
    }
  });

  it('rate limits direct password reset requests', async function () {
    const attempts = configUtils.config.get('spam').user_reset.freeRetries + 1;

    for (let i = 0; i < attempts; i++) {
      const response = await post(`${AUTH}/request-password-reset`)
        .set('Origin', adminOrigin)
        .send({ email: owner.email });
      // Reaches Better Auth: reset emails aren't wired up yet
      assert.equal(response.status, 400);
      assert.equal(response.body.code, 'RESET_PASSWORD_DISABLED');
    }

    await post(`${AUTH}/request-password-reset`)
      .set('Origin', adminOrigin)
      .send({ email: owner.email })
      .expect(429);
  });
});
