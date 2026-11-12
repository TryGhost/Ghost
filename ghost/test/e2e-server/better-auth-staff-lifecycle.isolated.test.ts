import assert from 'node:assert/strict';
import sinon from 'sinon';
import request from 'supertest';
import { seedCredentialAccounts } from '../../core/server/auth/better-auth/seed-credential-accounts';

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

const [owner, locked, inactive] = DataGenerator.Content.users;

// Native sign-in and the server-only helpers under ghostStaffLifecycle
describe.skipIf(isSQLite)('ghostStaffLifecycle under auth:engine better-auth', function () {
  const sandbox = sinon.createSandbox();
  const adminOrigin = 'http://localhost:2369';
  const host = new URL(adminOrigin).host;
  let app: Parameters<typeof request>[0];
  let mail: ReturnType<typeof mockManager.mockMail>;

  const signIn = (email: string, password: string) =>
    request(app)
      .post('/ghost/api/admin/auth/sign-in/email')
      .set('Host', host)
      .set('Origin', adminOrigin)
      .send({ email, password });

  const userRow = (id: string) => db.knex('users').where({ id }).first();
  const sessionCount = async (userId?: string) => {
    const query = db.knex('user_sessions');
    if (userId) {
      query.where({ user_id: userId });
    }
    const [{ count }] = await query.count({ count: '*' });
    return Number(count);
  };
  const api = () => auth.betterAuth.service.api;

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
    await resetRateLimits();
    await db.knex('user_sessions').del();
    await db.knex('users').update({ status: 'active', last_seen: null });
    await db.knex('users').where({ id: locked.id }).update({ status: 'locked' });
    await db.knex('users').where({ id: inactive.id }).update({ status: 'inactive' });
    // From the fixtures' passwords, which replaced the ones boot seeded
    await db.knex('user_accounts').del();
    await seedCredentialAccounts(db.knex);
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

  describe('native sign-in', function () {
    it('signs in an active user and records last_seen', async function () {
      const response = await signIn(owner.email, owner.password).expect(200);

      assert.match([response.headers['set-cookie']].flat().join(), /ghost-admin-api-session=/);
      assert.equal(await sessionCount(owner.id), 1);
      const user = await userRow(owner.id);
      assert.equal(user.status, 'active');
      assert.ok(user.last_seen);
    });

    it('refuses a locked user whose password matches and emails a reset link', async function () {
      const response = await signIn(locked.email, locked.password).expect(401);

      assert.equal(response.body.code, 'PASSWORD_RESET_REQUIRED');
      assert.equal(await sessionCount(locked.id), 0);
      assert.equal((await userRow(locked.id)).status, 'locked');
      const sent = await mockManager.assert.sentEmailEventually({ to: locked.email });
      assert.match(sent.html, /\/ghost\/reset\//);
    });

    it('emails a locked user a reset link on a wrong password, with the generic error', async function () {
      const response = await signIn(locked.email, 'not-the-password').expect(401);

      assert.equal(response.body.code, 'INVALID_EMAIL_OR_PASSWORD');
      await mockManager.assert.sentEmailEventually({ to: locked.email });
    });

    it('refuses a suspended user whose password matches', async function () {
      const response = await signIn(inactive.email, inactive.password).expect(403);

      assert.equal(response.body.code, 'ACCOUNT_SUSPENDED');
      assert.equal(response.body.message, 'Your account was suspended.');
      assert.equal(await sessionCount(inactive.id), 0);
      mail.assertSentEmailCount(0);
    });

    it('answers an unknown email, a wrong password and a suspended user alike', async function () {
      const unknown = await signIn('nobody@example.com', owner.password).expect(401);
      const wrong = await signIn(owner.email, 'not-the-password').expect(401);
      const suspended = await signIn(inactive.email, 'not-the-password').expect(401);

      assert.equal(unknown.body.code, 'INVALID_EMAIL_OR_PASSWORD');
      assert.deepEqual(wrong.body, unknown.body);
      assert.deepEqual(suspended.body, unknown.body);
      assert.equal((await userRow(owner.id)).last_seen, null);
      mail.assertSentEmailCount(0);
    });

    it('looks nothing up for a cross-origin request', async function () {
      const response = await request(app)
        .post('/ghost/api/admin/auth/sign-in/email')
        .set('Host', host)
        .set('Origin', 'http://elsewhere.example')
        .send({ email: locked.email, password: locked.password })
        .expect(403);

      assert.equal(response.body.code, 'INVALID_ORIGIN');
      mail.assertSentEmailCount(0);
    });
  });

  describe('server-only helpers', function () {
    it('creates a verified session with its cookie', async function () {
      const { headers } = await api().createVerifiedSession({
        body: { userId: owner.id, origin: adminOrigin },
        returnHeaders: true,
      });

      const session = await db.knex('user_sessions').where({ user_id: owner.id }).first();
      assert.equal(Boolean(session.verified), true);
      assert.equal(session.origin, adminOrigin);
      assert.match(headers.get('set-cookie') ?? '', /ghost-admin-api-session=/);
      assert.ok((await userRow(owner.id)).last_seen);
    });

    it('refuses a verified session for a suspended user', async function () {
      await assert.rejects(
        api().createVerifiedSession({ body: { userId: inactive.id } }),
        (err: { body?: { code?: string } }) => err.body?.code === 'ACCOUNT_SUSPENDED',
      );
      assert.equal(await sessionCount(inactive.id), 0);
    });

    it('revokes one user’s sessions, then every session', async function () {
      const admin = DataGenerator.Content.users[3];
      await signIn(owner.email, owner.password).expect(200);
      await signIn(admin.email, admin.password).expect(200);

      await api().revokeUserSessions({ body: { userId: owner.id } });
      assert.equal(await sessionCount(owner.id), 0);
      assert.equal(await sessionCount(admin.id), 1);

      await api().revokeAllSessions();
      assert.equal(await sessionCount(), 0);
    });

    it('locks every user but the suspended, and replaces every password', async function () {
      const before = await db.knex('user_accounts').where({ user_id: owner.id }).first();

      const { count } = await api().lockAllUsers();

      const [{ total }] = await db.knex('users').count({ total: '*' });
      assert.equal(count, Number(total));
      assert.equal((await userRow(owner.id)).status, 'locked');
      assert.equal((await userRow(inactive.id)).status, 'inactive');
      const after = await db.knex('user_accounts').where({ user_id: owner.id }).first();
      assert.notEqual(after.password, before.password);

      const response = await signIn(owner.email, owner.password).expect(401);
      assert.equal(response.body.code, 'INVALID_EMAIL_OR_PASSWORD');
      await mockManager.assert.sentEmailEventually({ to: owner.email });
    });
  });
});
