var _ = require('lodash'),
    config = require('../../../../config'),
    database = require('../../../db');

module.exports = function after() {
    // do not close database connection in test mode, because all tests are executed one after another
    // this check is not nice, but there is only one other solution i can think of:
    // forward a custom object to knex-migrator, which get's forwarded to the hooks
    if (config.get('env').match(/testing/g)) {
        return;
    }

    // running knex-migrator migrate --init does two different migration calls within a single process
    // we have to ensure that we clear the Ghost cache afterwards, otherwise we operate on a destroyed connection
    _.each(require.cache, function (val, key) {
        if (key.match(/core\/server/)) {
            delete require.cache[key];
        }
    });

    // we need to close the database connection
    // the after hook signals the last step of a knex-migrator command
    // Example:
    // Ghost-CLI calls knexMigrator.init and afterwards it starts Ghost, but Ghost-CLI can't shutdown
    // if Ghost keeps a connection alive
    return database.knex.destroy();
};
