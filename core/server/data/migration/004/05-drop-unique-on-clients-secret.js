var commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'clients',
    column   = 'secret';

module.exports = function dropUniqueOnClientsSecret(logInfo) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (exists) {
            return commands.getIndexes(table).then(function (indexes) {
                if (indexes.indexOf(table + '_' + column + '_unique') > -1) {
                    logInfo('Dropping unique on: ' + table + '.' + column);
                    return commands.dropUnique(table, column);
                }
            });
        }
    });
};
