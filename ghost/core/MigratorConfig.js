/**
 * knex-migrator requires this exact filename in the project root, therefore, linter naming rules are disabled here.
 * @see https://github.com/TryGhost/knex-migrator
 */
/**
 * Register tsx so that require() can resolve .ts files used in server code.
 *
 * tsx is a devDependency, so this is a no-op in production where Ghost runs
 * migrations on boot through its own process (which uses --import=tsx) or in
 * CI environments where a build has already run and the TS is already compiled
 */
try {
  require('tsx/cjs');
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    throw err;
  }
}

const cloneDeep = require('lodash/cloneDeep');
const config = require('./core/shared/config');
const ghostVersion = require('@tryghost/version');

/**
 * knex-migrator can be used via CLI or within the application
 * when using the CLI, we need to ensure that our global overrides are triggered
 */
require('./core/server/overrides');

module.exports = {
  currentVersion: ghostVersion.safe,
  // Cloned because knex-migrator mutates the database config it is handed
  // (lib/database.js sets connection.timezone/charset/decimalNumbers and deletes
  // connection.filename). Config is frozen once loaded, and knex-migrator's
  // module body is sloppy-mode CommonJS, so those writes would silently do
  // nothing rather than throw - leaving its knex connection without the UTC
  // timezone it means to force.
  database: cloneDeep(config.get('database')),
  migrationPath: config.get('paths:migrationPath'),
};
