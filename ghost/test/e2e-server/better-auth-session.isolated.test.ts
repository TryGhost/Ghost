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
const db = require('../../core/server/data/db');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');
const DataGenerator = require('../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

const [owner, locked, inactive] = DataGenerator.Content.users;

// POST and DELETE /session as compatibility controllers over Better Auth
describe.skipIf(isSQLite)('Admin API /session under auth:engine better-auth', function () {
  const sandbox = sinon.createSandbox();
  const adminOrigin = 'http://localhost:2369';
  const host = new URL(adminOrigin).host;
  let app: Parameters<typeof request>[0];

  const signIn = (username: string, password: string, origin = adminOrigin) =>
    request(app)
      .post('/ghost/api/admin/session/')
      .set('Host', host)
      .set('Origin', origin)
      .send({ username, password });

  const cookieOf = (response: request.Response) =>
    [response.headers['set-cookie']].flat().map((c: string) => c.split(';')[0]);

  const me = (cookie: string[]) =>
    request(app)
      .get('/ghost/api/admin/users/me/')
      .set('Host', host)
      .set('Origin', adminOrigin)
      .set('Cookie', cookie);

  const sessions = (userId: string) => db.knex('user_sessions').where({ user_id: userId });

  beforeAll(async function () {
    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
    configUtils.set('auth:engine', 'better-auth');
    configUtils.set('createInDevelopmentTables', true);
    configUtils.set('url', `${adminOrigin}/`);

    app = await startGhost({ backend: true, frontend: false, server: false });
    await fixtureManager.init('users');
  });

  beforeEach(async function () {
    // mockManager.restore() resets config, and the origin check reads the URL per request
    configUtils.set('url', `${adminOrigin}/`);
    configUtils.set('security:staffDeviceVerification', false);
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

  it('signs in with a verified session, then signs out', async function () {
    const response = await signIn(owner.email, owner.password).expect(201);
    const cookie = cookieOf(response);

    assert.deepEqual(cookie.length, 1);
    assert.match(cookie[0], /^ghost-admin-api-session=/);
    const [session] = await sessions(owner.id);
    assert.equal(Boolean(session.verified), true);
    await me(cookie).expect(200);

    const signOut = await request(app)
      .delete('/ghost/api/admin/session/')
      .set('Host', host)
      .set('Origin', adminOrigin)
      .set('Cookie', cookie)
      .expect(204);

    assert.match(cookieOf(signOut)[0], /^ghost-admin-api-session=$/);
    assert.equal((await sessions(owner.id)).length, 0);
    await me(cookie).expect(403);
  });

  it('leaves the session unverified when device verification is on', async function () {
    configUtils.set('security:staffDeviceVerification', true);

    const response = await signIn(owner.email, owner.password).expect(201);

    const [session] = await sessions(owner.id);
    assert.equal(Boolean(session.verified), false);
    await me(cookieOf(response)).expect(403);
  });

  it('reports a wrong password as legacy does', async function () {
    const response = await signIn(owner.email, 'not-the-password').expect(422);

    assert.equal(response.body.errors[0].code, 'PASSWORD_INCORRECT');
    assert.equal(response.body.errors[0].message, 'Your password is incorrect.');
  });

  it('reports an unknown email as legacy does', async function () {
    const response = await signIn('nobody@example.com', owner.password).expect(404);

    assert.equal(response.body.errors[0].message, 'There is no user with that email address.');
  });

  it('reports a suspended user as legacy does', async function () {
    const response = await signIn(inactive.email, inactive.password).expect(403);

    assert.equal(response.body.errors[0].message, 'Your account was suspended.');
    assert.equal((await sessions(inactive.id)).length, 0);
  });

  it('reports a locked user as legacy does', async function () {
    const response = await signIn(locked.email, 'not-the-password').expect(401);

    assert.equal(response.body.errors[0].type, 'PasswordResetRequiredError');
    assert.equal((await sessions(locked.id)).length, 0);
  });

  it('refuses a missing password', async function () {
    const response = await request(app)
      .post('/ghost/api/admin/session/')
      .set('Host', host)
      .set('Origin', adminOrigin)
      .send({ username: owner.email })
      .expect(401);

    assert.equal(response.body.errors[0].message, 'Access Denied.');
  });

  it('refuses a cross-origin sign-in', async function () {
    const response = await signIn(owner.email, owner.password, 'http://elsewhere.example').expect(
      400,
    );

    assert.match(response.body.errors[0].message, /incorrect origin/);
    assert.equal((await sessions(owner.id)).length, 0);
  });
});
