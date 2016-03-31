var commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'push_subscribers',
    message  = 'Creating table: ' + table;

module.exports = function addPushSubscribersTable(logger) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (!exists) {
            logger.info(message);
            return commands.createTable(table);
        } else {
            logger.warn(message);
        }
    });
};
