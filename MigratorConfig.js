var config = require('./core/server/config'),
    utils = require('./core/server/utils');

/**
 * knex-migrator can be used via CLI or within the application
 * when using the CLI, we need to ensure that our global overrides are triggered
 */
require('./core/server/overrides');

module.exports = {
    currentVersion: utils.ghostVersion.safe,
    database: config.get('database'),
    migrationPath: config.get('paths:migrationPath')
};
