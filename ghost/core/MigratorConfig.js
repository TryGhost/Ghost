/**
 * knex-migrator requires this exact filename in the project root, therefore, linter naming rules are disabled here.
 * @see https://github.com/TryGhost/knex-migrator
 */
/* eslint-disable ghost/filenames/match-regex */
const config = require('./core/shared/config');
const ghostVersion = require('@tryghost/version');

/**
 * knex-migrator can be used via CLI or within the application
 * when using the CLI, we need to ensure that our global overrides are triggered
 */
require('./core/server/overrides');

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

module.exports = {
    currentVersion: ghostVersion.safe,
    database: config.get('database'),
    migrationPath: config.get('paths:migrationPath')
};
