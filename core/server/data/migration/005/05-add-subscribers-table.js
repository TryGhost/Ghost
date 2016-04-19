var commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'subscribers',
    message  = 'Creating table: ' + table;

module.exports = function addSubscribersTable(logger) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (!exists) {
            logger.info(message);
            return commands.createTable(table);
        } else {
            logger.warn(message);
        }
    });
};
