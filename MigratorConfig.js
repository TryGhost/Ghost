var config = require('./core/server/config'),
    utils = require('./core/server/utils');

module.exports = {
    currentVersion: utils.ghostVersion.safe,
    database: config.get('database'),
    migrationPath: config.get('paths:migrationPath')
};
