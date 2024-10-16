/* eslint-disable ghost/filenames/match-regex */
const config = require('./core/shared/config');
const ghostVersion = require('@tryghost/version');

/**
 * knex-migrator can be used via CLI or within the application
 * when using the CLI, we need to ensure that our global overrides are triggered
 */
require('./core/server/overrides');

module.exports = {
    currentVersion: ghostVersion.safe,
    database: config.get('database'),
    migrationPath: config.get('paths:migrationPath')
};
