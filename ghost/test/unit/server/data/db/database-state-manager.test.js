const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const DatabaseStateManager = require('../../../../../core/server/data/db/database-state-manager');
const configUtils = require('../../../../utils/config-utils');

describe('DatabaseStateManager', function () {
  let manager;

  beforeEach(function () {
    manager = new DatabaseStateManager({
      knexMigratorFilePath: configUtils.config.get('paths:appRoot'),
    });
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
  });

  describe('getState', function () {
    beforeEach(function () {
      sinon.stub(manager.knexMigrator, 'isDatabaseOK').rejects(
        new errors.MigrationError({
          message: 'Detected more items in the migrations table than expected.',
          code: 'MIGRATION_STATE_ERROR',
        }),
      );
    });

    it('treats unknown applied migrations as ready in development', async function () {
      configUtils.set('env', 'development');

      assert.equal(await manager.getState(), 0);
      assert.match(manager.warning, /pnpm reset:db/);
    });

    it('throws on unknown applied migrations outside development', async function () {
      configUtils.set('env', 'production');

      await assert.rejects(manager.getState(), { code: 'MIGRATION_STATE_ERROR' });
    });
  });
});
