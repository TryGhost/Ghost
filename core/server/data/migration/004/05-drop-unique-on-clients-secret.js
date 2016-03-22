var commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'clients',
    column   = 'secret',
    message  = 'Dropping unique on: ' + table + '.' + column;

module.exports = function dropUniqueOnClientsSecret(logger) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (exists) {
            return commands.getIndexes(table).then(function (indexes) {
                if (indexes.indexOf(table + '_' + column + '_unique') > -1) {
                    logger.info(message);
                    return commands.dropUnique(table, column);
                } else {
                    logger.warn(message);
                }
            });
        } else {
            // @TODO: this should probably be an error
            logger.warn(message);
        }
    });
};
