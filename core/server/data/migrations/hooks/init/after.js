var config = require('../../../../config'),
    database = require('../../../db');

module.exports = function after() {
    // do not close database connection in test mode, because all tests are executed one after another
    // this check is not nice, but there is only one other solution i can think of:
    // forward a custom object to knex-migrator, which get's forwarded to the hooks
    if (config.get('env').match(/testing/g)) {
        return;
    }

    // we need to close the database connection
    // the after hook signals the last step of a knex-migrator command
    // Example:
    // Ghost-CLI calls knexMigrator.init and afterwards it starts Ghost, but Ghost-CLI can't shutdown
    // if Ghost keeps a connection alive
    return database.knex.destroy();
};
