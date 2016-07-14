var Promise = require('bluebird'),
    commands = require('../../schema').commands,
    table = 'clients',
    column = 'secret',
    message = 'Dropping unique on: ' + table + '.' + column;

module.exports = function dropUniqueOnClientsSecret(options, logger) {
    var transaction = options.transacting;

    return transaction.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                return Promise.reject(new Error('Table does not exist!'));
            }

            return commands.getIndexes(table, transaction);
        })
        .then(function (indexes) {
            if (indexes.indexOf(table + '_' + column + '_unique') > -1) {
                logger.info(message);
                return commands.dropUnique(table, column, transaction);
            } else {
                logger.warn(message);
            }
        });
};
