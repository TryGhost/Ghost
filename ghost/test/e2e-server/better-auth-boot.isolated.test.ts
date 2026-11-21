import assert from 'node:assert/strict';
import sinon from 'sinon';
import * as security from '@tryghost/security';
import type { GhostAuth } from '../../core/server/auth/better-auth';

const { startGhost, fixtureManager, configUtils } = require('../utils/e2e-framework');
const { AdminAPITestAgent } = require('../utils/agents');
const db = require('../../core/server/data/db');
const auth = require('../../core/server/auth');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');
const DataGenerator = require('../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

/** Changes the owner's password through legacy; it lands in the credential row and signs in */
async function assertPasswordInCredentialRow(app: unknown, newPassword: string) {
  const admin = new AdminAPITestAgent(app, {
    apiURL: '/ghost/api/admin/',
    originURL: configUtils.config.get('url'),
  });
  const owner = DataGenerator.Content.users[0];
  await admin.loginAsOwner();
  await admin
    .put('users/password/')
    .body({
      password: [
        { user_id: owner.id, oldPassword: owner.password, newPassword, ne2Password: newPassword },
      ],
    })
    .expectStatus(200);
  const { password } = await db
    .knex('user_accounts')
    .where({ provider_id: 'credential', account_id: owner.id })
    .first('password');
  assert.equal(await security.password.compare(newPassword, password), true);
  const user = await db.knex('users').where({ id: owner.id }).first('password');
  assert.equal(user.password, '!');
  await admin.loginAs(owner.email, newPassword);
  await admin.get('users/me/').expectStatus(200);
}

async function boot() {
  const app = await startGhost({ backend: true, frontend: false, server: false });
  await fixtureManager.init('users');
  return app;
}

describe('Better Auth boot', function () {
  const sandbox = sinon.createSandbox();

  beforeAll(function () {
    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');
  });

  afterEach(async function () {
    try {
      await jobsService.shutdown();
    } finally {
      await stripe.shutdown();
    }
  });

  afterAll(async function () {
    sandbox.restore();
    await configUtils.restore();
  });

  it('boots under legacy without building Better Auth, keeping passwords in user_accounts', async function () {
    configUtils.set('auth:engine', 'legacy');
    configUtils.set('createInDevelopmentTables', false);

    const app = await boot();

    assert.throws(() => auth.betterAuth.service, {
      message: 'Better Auth used before init(). Call init() from boot first.',
    });
    await assertPasswordInCredentialRow(app, 'changed-under-legacy-1');
  });

  // Better Auth needs MySQL
  it.skipIf(isSQLite)('builds Better Auth at boot under better-auth', async function () {
    configUtils.set('auth:engine', 'better-auth');
    configUtils.set('createInDevelopmentTables', false);

    await boot();

    const instance: GhostAuth = auth.betterAuth.service;
    const context = await instance.$context;
    assert.equal(
      context.baseURL,
      `${new URL(configUtils.config.get('url')).origin}/ghost/api/admin/auth`,
    );
    assert.equal(context.authCookies.sessionToken.name, 'ghost-admin-api-session');
  });
});
