var Promise = require('bluebird'),
    commands = require('../../schema').commands,
    table = 'tags',
    column = 'hidden',
    message = 'Removing column: ' + table + '.' + column;

module.exports = function dropHiddenColumnFromTags(options, logger) {
    var transaction = options.transacting;

    return transaction.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                return Promise.reject(new Error('Table does not exist!'));
            }

            return transaction.schema.hasColumn(table, column);
        })
        .then(function (exists) {
            if (exists) {
                logger.info(message);
                return commands.dropColumn(table, column, transaction);
            } else {
                logger.warn(message);
            }
        });
};
