import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
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
const models = require('../../core/server/models');
const db = require('../../core/server/data/db');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');
const DataGenerator = require('../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

const [owner, admin, editor, author] = DataGenerator.Content.users;

// Security events under better-auth revoke Better Auth sessions and the legacy
// rows a rollback to `legacy` would read (plan §5.4, §8)
describe.skipIf(isSQLite)('Session revocation under auth:engine better-auth', function () {
  const sandbox = sinon.createSandbox();
  const adminOrigin = 'http://localhost:2369';
  const host = new URL(adminOrigin).host;
  let app: Parameters<typeof request>[0];
  let mail: { getSentEmail(): { text: string } };

  // The legacy engine's session handling on the same database: a cookie it
  // issued before the cutover, and the check it runs after a rollback. Under
  // /ghost, the legacy cookie's path, outside which express-session is skipped
  const legacyApp = express();
  legacyApp.post('/ghost/sign-in/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await models.User.findOne({ id: req.params.id });
      await auth.session.sessionService.createVerifiedSessionForUser(req, res, user);
      res.sendStatus(201);
    } catch (err) {
      next(err);
    }
  });
  legacyApp.get(
    '/ghost/me',
    auth.session.authenticate,
    (req: Request & { user?: unknown }, res) => {
      res.sendStatus(req.user ? 200 : 403);
    },
  );

  const cookieOf = (response: request.Response) =>
    [response.headers['set-cookie']].flat().map((c: string) => c.split(';')[0]);

  const legacySignIn = async (userId: string) =>
    cookieOf(
      await request(legacyApp)
        .post(`/ghost/sign-in/${userId}`)
        .set('Origin', adminOrigin)
        .expect(201),
    );

  const legacyMe = (cookie: string[]) =>
    request(legacyApp).get('/ghost/me').set('Origin', adminOrigin).set('Cookie', cookie);

  const adminApi = (method: 'get' | 'put' | 'post' | 'delete', path: string, cookie?: string[]) => {
    const agent = request(app);
    const req = agent[method](`/ghost/api/admin/${path}`)
      .set('Host', host)
      .set('Origin', adminOrigin);
    return cookie ? req.set('Cookie', cookie) : req;
  };

  const signIn = async (user: { email: string; password: string }) =>
    cookieOf(
      await adminApi('post', 'session/')
        .send({ username: user.email, password: user.password })
        .expect(201),
    );

  const me = (cookie: string[]) => adminApi('get', 'users/me/', cookie);

  const sessions = (userId: string) => db.knex('user_sessions').where({ user_id: userId });
  const legacySessions = (userId: string) => db.knex('sessions').where({ user_id: userId });

  // A pre-cutover legacy cookie that a rollback would honour
  async function preCutoverCookie(userId: string) {
    const cookie = await legacySignIn(userId);
    await legacyMe(cookie).expect(200);
    return cookie;
  }

  const changePassword = (cookie: string[], userId: string, oldPassword?: string) =>
    adminApi('put', 'users/password/', cookie).send({
      password: [
        {
          newPassword: 'Sl1m3rson99-rotated!',
          ne2Password: 'Sl1m3rson99-rotated!',
          oldPassword,
          user_id: userId,
        },
      ],
    });

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
    // Undoes an earlier test's password change or suspension
    for (const user of [owner, admin, editor]) {
      await models.User.edit(
        { password: user.password, status: 'active' },
        { id: user.id, context: { internal: true } },
      );
    }
    await db.knex('user_sessions').del();
    await db.knex('sessions').del();
    mail = mockManager.mockMail();
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

  it('a password change signs out other sessions and keeps this browser verified', async function () {
    const legacy = await preCutoverCookie(owner.id);
    const current = await signIn(owner);
    const other = await signIn(owner);

    const response = await changePassword(current, owner.id, owner.password).expect(200);
    const replaced = cookieOf(response);

    assert.equal(replaced.length, 1);
    assert.match(replaced[0], /^ghost-admin-api-session=./);
    assert.equal((await me(replaced).expect(200)).body.users[0].id, owner.id);
    await me(current).expect(403);
    await me(other).expect(403);
    const [session] = await sessions(owner.id);
    assert.equal(Boolean(session.verified), true);
    assert.equal((await sessions(owner.id)).length, 1);

    assert.equal((await legacySessions(owner.id)).length, 0);
    await legacyMe(legacy).expect(403);
  });

  it("changing another user's password signs them out everywhere", async function () {
    const legacy = await preCutoverCookie(admin.id);
    const ownerCookie = await signIn(owner);
    const adminCookie = await signIn(admin);

    const response = await changePassword(ownerCookie, admin.id).expect(200);

    assert.equal(response.headers['set-cookie'], undefined);
    await me(ownerCookie).expect(200);
    await me(adminCookie).expect(403);
    assert.equal((await sessions(admin.id)).length, 0);
    await legacyMe(legacy).expect(403);
  });

  it('a password reset signs out other sessions and signs this browser in, verified', async function () {
    const legacy = await preCutoverCookie(owner.id);
    const other = await signIn(owner);

    await adminApi('post', 'authentication/password_reset/')
      .send({ password_reset: [{ email: owner.email }] })
      .expect(200);
    const token = mail.getSentEmail().text.match(/\/reset\/([^/]+)\//)?.[1];

    const response = await adminApi('put', 'authentication/password_reset/')
      .send({
        password_reset: [
          { token, newPassword: 'Sl1m3rson99-reset!', ne2Password: 'Sl1m3rson99-reset!' },
        ],
      })
      .expect(200);
    const current = cookieOf(response);

    assert.equal(current.length, 1);
    assert.equal((await me(current).expect(200)).body.users[0].id, owner.id);
    await me(other).expect(403);
    const [session] = await sessions(owner.id);
    assert.equal(Boolean(session.verified), true);
    assert.equal((await sessions(owner.id)).length, 1);

    assert.equal((await legacySessions(owner.id)).length, 0);
    await legacyMe(legacy).expect(403);
  });

  it('refuses a password reset from another origin, as legacy does', async function () {
    const other = await signIn(owner);

    await adminApi('post', 'authentication/password_reset/')
      .send({ password_reset: [{ email: owner.email }] })
      .expect(200);
    const token = mail.getSentEmail().text.match(/\/reset\/([^/]+)\//)?.[1];

    const response = await adminApi('put', 'authentication/password_reset/')
      .set('Origin', 'http://elsewhere.example')
      .send({
        password_reset: [
          { token, newPassword: 'Sl1m3rson99-reset!', ne2Password: 'Sl1m3rson99-reset!' },
        ],
      })
      .expect(400);

    assert.match(response.body.errors[0].message, /incorrect origin/);
    assert.equal(response.headers['set-cookie'], undefined);
    await me(other).expect(200);
  });

  it('suspending a user signs them out everywhere', async function () {
    const legacy = await preCutoverCookie(editor.id);
    const ownerCookie = await signIn(owner);
    await signIn(editor);

    await adminApi('put', `users/${editor.id}/`, ownerCookie)
      .send({ users: [{ status: 'inactive' }] })
      .expect(200);

    assert.equal((await sessions(editor.id)).length, 0);
    assert.equal((await legacySessions(editor.id)).length, 0);

    // A rollback that also reinstates the user still finds no session
    await db.knex('users').where({ id: editor.id }).update({ status: 'active' });
    await legacyMe(legacy).expect(403);
  });

  it('deleting a user signs them out everywhere', async function () {
    await preCutoverCookie(author.id);
    const ownerCookie = await signIn(owner);
    await signIn(author);

    await adminApi('delete', `users/${author.id}/`, ownerCookie).expect(204);

    assert.equal((await sessions(author.id)).length, 0);
    assert.equal((await legacySessions(author.id)).length, 0);
  });

  it('the authentication reset signs everyone out', async function () {
    const legacy = await preCutoverCookie(admin.id);
    const ownerCookie = await signIn(owner);
    const adminCookie = await signIn(admin);

    await adminApi('post', 'authentication/reset/', ownerCookie).expect(200);

    await me(ownerCookie).expect(403);
    await me(adminCookie).expect(403);
    assert.equal((await db.knex('user_sessions')).length, 0);
    assert.equal((await db.knex('sessions')).length, 0);

    // Locked by the reset; reinstated so only the missing session refuses it
    await db.knex('users').update({ status: 'active' });
    await legacyMe(legacy).expect(403);
  });
});
