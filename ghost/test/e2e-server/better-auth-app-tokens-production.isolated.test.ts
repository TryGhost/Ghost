import assert from 'node:assert/strict';
import sinon from 'sinon';
import ObjectId from 'bson-objectid';
import type { GhostAuth } from '../../core/server/auth/better-auth';

const { startGhost, fixtureManager, configUtils } = require('../utils/e2e-framework');
const db = require('../../core/server/data/db');
const dbUtils = require('../utils/db-utils');
const auth = require('../../core/server/auth');
const jobsService = require('../../core/server/services/jobs-service');
const stripe = require('../../core/server/services/stripe');
const sentry = require('../../core/shared/sentry');
const urlUtils = require('../../core/shared/url-utils').default;
const DataGenerator = require('../utils/fixtures/data-generator');

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(db.knex.client.config.client);

const OAUTH_TABLES = [
  'oauth_clients',
  'oauth_resources',
  'oauth_client_resources',
  'oauth_refresh_tokens',
  'oauth_access_tokens',
  'oauth_consents',
  'oauth_client_assertions',
  'oauth_jwks',
];

/** As a production site upgrading to this release: no OAuth tables, and their migration not yet run */
async function toDatabaseBeforeUpgrade() {
  for (const table of OAUTH_TABLES.toReversed()) {
    await db.knex.schema.dropTableIfExists(table);
  }
  // knex-migrator records a .ts migration under its .js name
  await db.knex('migrations').where('name', 'like', '%-add-oauth-provider-tables.js').del();
}

// Better Auth needs MySQL
describe.skipIf(isSQLite)('App tokens on a production site', function () {
  const sandbox = sinon.createSandbox();

  beforeAll(async function () {
    configUtils.set('sentry:disabled', true);
    sandbox.stub(sentry, 'captureException');
    sandbox.stub(sentry, 'captureMessage');

    configUtils.set('env', 'production');
    // Production refuses plain HTTP while the fixtures' Stripe keys are connected
    configUtils.set('url', configUtils.config.get('url').replace(/^http:/, 'https:'));
    configUtils.set('auth:engine', 'better-auth');
    configUtils.set('createInDevelopmentTables', false);
    configUtils.set('labs:apps', true);

    // startGhost resets the database to the run's template, then boots, which migrates
    const reset = dbUtils.reset;
    sandbox.stub(dbUtils, 'reset').callsFake(async (options: unknown) => {
      await reset(options);
      await toDatabaseBeforeUpgrade();
    });
    await startGhost({ backend: true, frontend: false, server: false });
    await fixtureManager.init('users');
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

  it('migrates, then registers the OAuth provider, which issues app tokens it validates', async function () {
    for (const table of OAUTH_TABLES) {
      assert.ok(await db.knex.schema.hasTable(table), `creates ${table}`);
    }
    const { appTokens } = auth;
    assert.equal(appTokens.availability(), 'ready');

    const owner = DataGenerator.Content.users[0];
    const installation = {
      id: new ObjectId().toHexString(),
      active: true,
      scopes: ['post:browse'],
    };
    await appTokens.reconcileClient(installation);
    const { session } = await (auth.betterAuth.service as GhostAuth).api.createVerifiedSession({
      body: { userId: owner.id, origin: urlUtils.getAdminOrigin() },
    });

    const issued = await appTokens.issue({
      installationId: installation.id,
      userId: owner.id,
      sessionId: session.id,
      scopes: installation.scopes,
    });

    assert.ok('accessToken' in issued, `issues a token: ${JSON.stringify(issued)}`);
    const validated = await appTokens.validate(issued.accessToken);
    assert.equal(validated?.installationId, installation.id);
    assert.equal(validated?.userId, owner.id);
  });
});
