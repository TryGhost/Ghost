import assert from 'node:assert/strict';
import sinon from 'sinon';
import request from 'supertest';
import { SSOBase } from '@tryghost/adapter-base-sso';

const {
  startGhost,
  fixtureManager,
  configUtils,
  mockManager,
  resetRateLimits,
} = require('../utils/e2e-framework');
const db = require('../../core/server/data/db');
const adapterManager = require('../../core/server/services/adapter-manager').default;
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');
const DataGenerator = require('../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

const [owner, locked, inactive] = DataGenerator.Content.users;

// The SSO adapter hook (Ghost(Pro) support access) under ghostSso
describe.skipIf(isSQLite)('SSO under auth:engine better-auth', function () {
  const sandbox = sinon.createSandbox();
  const adminOrigin = 'http://localhost:2369';
  const host = new URL(adminOrigin).host;
  let app: Parameters<typeof request>[0];

  // Resolves the email in a request header through the user repository Ghost injects
  class MockSSOAdapter extends SSOBase<string, string> {
    async getRequestCredentials(req: { get(name: string): string | undefined }) {
      return req.get('x-test-sso-email') ?? null;
    }

    async getIdentityFromCredentials(email: string) {
      return email;
    }

    async getUserForIdentity(email: string) {
      return this.getUserByEmail(email);
    }
  }

  // The admin app answers POST /ghost/ with a 404 after the hook runs, as in sso.test.js
  const ssoSignIn = (email?: string) => {
    const req = request(app).post('/ghost/').set('Host', host);
    return email ? req.set('x-test-sso-email', email) : req;
  };

  const cookieOf = (response: request.Response) =>
    [response.headers['set-cookie'] ?? []].flat().map((c: string) => c.split(';')[0]);

  const me = (cookie: string[]) =>
    request(app)
      .get('/ghost/api/admin/users/me/')
      .set('Host', host)
      .set('Origin', adminOrigin)
      .set('Cookie', cookie);

  const sessions = (userId: string) => db.knex('user_sessions').where({ user_id: userId });
  const statusOf = async (userId: string) =>
    (await db.knex('users').where({ id: userId }).first('status')).status;

  beforeAll(async function () {
    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    configUtils.set('auth:engine', 'better-auth');
    configUtils.set('createInDevelopmentTables', true);
    configUtils.set('url', `${adminOrigin}/`);

    const getAdapter = adapterManager.getAdapter;
    sandbox
      .stub(adapterManager, 'getAdapter')
      .callsFake((name: unknown) =>
        name === 'sso' ? new MockSSOAdapter() : getAdapter.call(adapterManager, name),
      );

    app = await startGhost({ backend: true, frontend: false, server: false });
    await fixtureManager.init('users');
  });

  beforeEach(async function () {
    configUtils.set('url', `${adminOrigin}/`);
    // SSO counts as verified, so device verification stays on
    configUtils.set('security:staffDeviceVerification', true);
    await resetRateLimits();
    await db.knex('user_sessions').del();
    await db.knex('users').update({ status: 'active' });
    await db.knex('users').where({ id: locked.id }).update({ status: 'locked' });
    await db.knex('users').where({ id: inactive.id }).update({ status: 'inactive' });
    mockManager.mockMail();
  });

  afterEach(function () {
    mockManager.restore();
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

  it('signs in with a verified session pinned to the admin origin', async function () {
    const cookie = cookieOf(await ssoSignIn(owner.email));

    assert.equal(cookie.length, 1);
    assert.match(cookie[0], /^ghost-admin-api-session=./);
    const [session] = await sessions(owner.id);
    assert.equal(Boolean(session.verified), true);
    assert.equal(session.origin, adminOrigin);

    const response = await me(cookie).expect(200);
    assert.equal(response.body.users[0].id, owner.id);
  });

  it('unlocks a locked user', async function () {
    const cookie = cookieOf(await ssoSignIn(locked.email));

    assert.equal(await statusOf(locked.id), 'active');
    await me(cookie).expect(200);
  });

  it('refuses a suspended user', async function () {
    const response = await ssoSignIn(inactive.email);

    assert.deepEqual(cookieOf(response), []);
    assert.equal(await statusOf(inactive.id), 'inactive');
    assert.equal((await sessions(inactive.id)).length, 0);
  });

  it('leaves the request alone without credentials', async function () {
    const response = await ssoSignIn();

    assert.deepEqual(cookieOf(response), []);
    assert.equal(
      await db
        .knex('user_sessions')
        .count('* as n')
        .first()
        .then((r: { n: number }) => r.n),
      0,
    );
  });

  it('leaves no legacy session', async function () {
    await ssoSignIn(owner.email);

    assert.equal((await db.knex('sessions').where({ user_id: owner.id })).length, 0);
  });
});
