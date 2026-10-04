import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const config = require('../../core/shared/config');
const migratorConfig = require('../../MigratorConfig.js');

describe('MigratorConfig', function () {
  it('loads in a bare Node process', function () {
    assert.doesNotThrow(() => {
      execFileSync(process.execPath, ['-e', "require('./MigratorConfig.js')"], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe',
      });
    });
  });

  it('hands knex-migrator a mutable copy of the database config', function () {
    // knex-migrator's connect() assembles its knex options by mutating what it
    // is given - connection.timezone, charset and decimalNumbers, and a delete
    // of connection.filename. Config is read-only, so it has to get a copy, or
    // those writes are dropped and its connection loses them.
    assert.notEqual(migratorConfig.database, config.get('database'));
    assert.deepEqual(migratorConfig.database, config.get('database'));

    assert.ok(!Object.isFrozen(migratorConfig.database));
    assert.ok(!Object.isFrozen(migratorConfig.database.connection));

    migratorConfig.database.connection.timezone = 'Z';

    assert.equal(migratorConfig.database.connection.timezone, 'Z');
    assert.equal(config.get('database:connection:timezone'), undefined);
  });

  it('still exposes the migration path', function () {
    assert.equal(migratorConfig.migrationPath, config.get('paths:migrationPath'));
  });
});
