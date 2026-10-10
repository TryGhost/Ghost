import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { configure } from '../../core/server/data/db/configure-knex';

const config = require('../../core/shared/config');
const migratorConfig = require('../../MigratorConfig.ts');

describe('MigratorConfig', function () {
  it('loads in a bare Node process', function () {
    // How the knex-migrator CLI loads it: Node's type stripping, no tsx loader.
    assert.doesNotThrow(() => {
      execFileSync(process.execPath, ['-e', "require('./MigratorConfig.ts')"], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe',
      });
    });
  });

  it('hands knex-migrator the knex config Ghost connects with', function () {
    // pool holds per-call afterCreate closures, so compare everything else
    const { pool: _migratorPool, ...migratorDatabase } = migratorConfig.database;
    const { pool: _ghostPool, ...ghostDatabase } = configure(config.get('database')) as Record<
      string,
      unknown
    >;

    assert.deepEqual(migratorDatabase, ghostDatabase);
  });

  it('hands knex-migrator a mutable copy of the database config', function () {
    // knex-migrator's connect() mutates what it is given. Config is read-only,
    // so those writes would be dropped if it got config's own objects.
    assert.notEqual(migratorConfig.database, config.get('database'));
    assert.notEqual(migratorConfig.database.connection, config.get('database:connection'));
    assert.ok(!Object.isFrozen(migratorConfig.database));
    assert.ok(!Object.isFrozen(migratorConfig.database.connection));
  });

  it('still exposes the migration path', function () {
    assert.equal(migratorConfig.migrationPath, config.get('paths:migrationPath'));
  });
});
