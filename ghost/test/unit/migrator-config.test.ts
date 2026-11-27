import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { configure } from '../../core/server/data/db/configure-knex';

const config = require('../../core/shared/config');
const { loadConfig } = require('knex-migrator/lib/utils');

const ghostRoot = path.join(__dirname, '../..');
// Resolved the way knex-migrator finds it, so this also covers unwrapping the default export.
const migratorConfig = loadConfig({ knexMigratorFilePath: ghostRoot });

describe('MigratorConfig', function () {
  it('loads the way the knex-migrator scripts run it', function () {
    // The root scripts preload tsx with the source condition.
    const output = execFileSync(
      process.execPath,
      [
        '--conditions=source',
        '--import=tsx',
        '-e',
        "const c = require('knex-migrator/lib/utils').loadConfig({knexMigratorFilePath: '.'}); console.log(JSON.stringify(Object.keys(c)))",
      ],
      { cwd: ghostRoot, stdio: 'pipe', encoding: 'utf8' },
    );

    assert.deepEqual(JSON.parse(output.trim().split('\n').at(-1)!), [
      'currentVersion',
      'database',
      'migrationPath',
    ]);
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

  it('still exposes the migration path', function () {
    assert.equal(migratorConfig.migrationPath, config.get('paths:migrationPath'));
  });
});
