import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { GhostAuth } from '../../core/server/auth/better-auth';

const { startGhost, fixtureManager, configUtils, dbUtils } = require('../utils/e2e-framework');
const { AdminAPITestAgent } = require('../utils/agents');
const db = require('../../core/server/data/db');
const auth = require('../../core/server/auth');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');

const AUTH_TABLES = ['verifications', 'user_accounts', 'user_sessions'];
const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

async function dropAuthTables() {
  for (const table of AUTH_TABLES) {
    await db.knex.schema.dropTableIfExists(table);
  }
}

async function boot() {
  const app = await startGhost({ backend: true, frontend: false, server: false });
  await fixtureManager.init('users');
  return app;
}

describe.skipIf(isSQLite)('Better Auth boot', function () {
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

  it('boots under legacy without the in-development tables and never builds Better Auth', async function () {
    configUtils.set('auth:engine', 'legacy');
    configUtils.set('createInDevelopmentTables', false);
    const reset = dbUtils.reset;
    const resetStub = sinon.stub(dbUtils, 'reset').callsFake(async (...args: unknown[]) => {
      await reset(...args);
      await dropAuthTables();
    });

    let app;
    try {
      app = await boot();
    } finally {
      resetStub.restore();
    }

    for (const table of AUTH_TABLES) {
      assert.equal(await db.knex.schema.hasTable(table), false, `${table} should not exist`);
    }
    assert.throws(() => auth.betterAuth.service, {
      message: 'Better Auth used before init(). Call init() from boot first.',
    });

    const admin = new AdminAPITestAgent(app, {
      apiURL: '/ghost/api/admin/',
      originURL: configUtils.config.get('url'),
    });
    await admin.loginAsOwner();
    await admin.get('users/me/').expectStatus(200);
  });

  it('refuses to build Better Auth without the in-development tables', async function () {
    configUtils.set('createInDevelopmentTables', false);
    await assert.rejects(auth.betterAuth.init(), {
      name: 'IncorrectUsageError',
      message: /requires the in-development auth tables/,
    });
  });

  it('builds Better Auth at boot under better-auth', async function () {
    configUtils.set('auth:engine', 'better-auth');
    configUtils.set('createInDevelopmentTables', true);

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
