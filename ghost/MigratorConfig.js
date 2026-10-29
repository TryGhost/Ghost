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

const _ = require('lodash');
const config = require('./core/shared/config');
const ghostVersion = require('@tryghost/version');

/**
 * knex-migrator can be used via CLI or within the application
 * when using the CLI, we need to ensure that our global overrides are triggered
 */
require('./core/server/overrides');

module.exports = {
  currentVersion: ghostVersion.safe,
  // A clone, because knex-migrator's connect() assembles its knex options by
  // mutating what it is given: it sets connection.timezone, charset and
  // decimalNumbers, and deletes connection.filename. Config is read-only, so
  // handing over the real thing drops those writes and leaves the migrator's
  // connection without them. cloneDeep rather than structuredClone - this hands
  // a tree to a third party, so it must not throw on a value it cannot clone.
  database: _.cloneDeep(config.get('database')),
  migrationPath: config.get('paths:migrationPath'),
};
