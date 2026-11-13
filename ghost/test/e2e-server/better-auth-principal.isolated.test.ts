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

const owner = DataGenerator.Content.users[0];

// The Admin API reads Better Auth's session cookie through resolvePrincipal
describe.skipIf(isSQLite)('Admin API session principal under auth:engine better-auth', function () {
  const sandbox = sinon.createSandbox();
  const siteOrigin = 'http://127.0.0.1:2369';
  const adminOrigin = 'http://localhost:2369';
  const host = new URL(adminOrigin).host;
  let app: Parameters<typeof request>[0];
  let cookie: string[];

  const me = (origin = adminOrigin) =>
    request(app)
      .get('/ghost/api/admin/users/me/')
      .set('Host', host)
      .set('Origin', origin)
      .set('Cookie', cookie);

  const updateSession = (fields: Record<string, unknown>) =>
    db.knex('user_sessions').where({ user_id: owner.id }).update(fields);

  beforeAll(async function () {
    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    configUtils.set('auth:engine', 'better-auth');
    configUtils.set('createInDevelopmentTables', true);
    configUtils.set('url', `${siteOrigin}/`);
    configUtils.set('admin:url', `${adminOrigin}/`);
    // Native sign-in then starts unverified; each test sets the state it needs
    configUtils.set('security:staffDeviceVerification', true);

    app = await startGhost({ backend: true, frontend: false, server: false });
    await fixtureManager.init('users');
  });

  beforeEach(async function () {
    await resetRateLimits();
    await db.knex('user_sessions').del();
    const response = await request(app)
      .post('/ghost/api/admin/auth/sign-in/email')
      .set('Host', host)
      .set('Origin', adminOrigin)
      .send({ email: owner.email, password: owner.password })
      .expect(200);
    cookie = [response.headers['set-cookie']].flat();
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

  it('treats an unverified session as signed out', async function () {
    const response = await me().expect(403);

    assert.equal(response.body.errors[0].message, 'Authorization failed');
  });

  it('authenticates a verified session as its user', async function () {
    await updateSession({ verified: true, origin: adminOrigin });

    const response = await me().expect(200);

    assert.equal(response.body.users[0].id, owner.id);
  });

  it('rejects the session cookie from the site origin', async function () {
    await updateSession({ verified: true, origin: adminOrigin });

    const response = await me(siteOrigin).expect(400);

    assert.match(response.body.errors[0].message, /Request made from incorrect origin/);
  });

  it('rejects a session created from another origin', async function () {
    await updateSession({ verified: true, origin: 'http://elsewhere.example' });

    await me().expect(400);
  });

  it('ignores a legacy session cookie', async function () {
    await request(app)
      .get('/ghost/api/admin/users/me/')
      .set('Host', host)
      .set('Origin', adminOrigin)
      .set('Cookie', 'ghost-admin-api-session=s%3Alegacy.signature')
      .expect(403);
  });
});
