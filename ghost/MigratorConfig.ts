/**
 * knex-migrator requires this exact filename in the project root, therefore, linter naming rules are disabled here.
 * @see https://github.com/TryGhost/knex-migrator
 *
 * Unbuilt, knex-migrator loads this with Node's type stripping, which can't resolve
 * Ghost's extensionless TS imports: keep it CommonJS (no ESM syntax beyond
 * `import type`) and register tsx first. Built trees load tsc's MigratorConfig.js.
 */
try {
  require('tsx/cjs');
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
    throw err;
  }
}

import type KnexMigrator from 'knex-migrator';
import type { DatabaseConfig } from './core/server/data/db/configure-knex';

const { defineConfig }: typeof KnexMigrator = require('knex-migrator');
const config: typeof import('./core/shared/config') = require('./core/shared/config');
const {
  configure,
}: typeof import('./core/server/data/db/configure-knex') = require('./core/server/data/db/configure-knex');
const ghostVersion = require('@tryghost/version');

/**
 * knex-migrator can be used via CLI or within the application
 * when using the CLI, we need to ensure that our global overrides are triggered
 */
require('./core/server/overrides');

module.exports = defineConfig({
  currentVersion: ghostVersion.safe,
  // The same knex options Ghost connects with, so migrations run with the app's
  // client settings. configure() also derives a fresh object, which knex-migrator
  // can mutate without writing into read-only config.
  database: configure(config.get('database') as DatabaseConfig),
  migrationPath: config.get('paths:migrationPath'),
});
