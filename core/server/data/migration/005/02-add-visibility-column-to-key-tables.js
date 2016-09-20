var Promise = require('bluebird'),
    commands = require('../../schema').commands,
    tables = ['posts', 'tags', 'users'],
    column = 'visibility';

module.exports = function addVisibilityColumnToKeyTables(options, logger) {
    var transaction = options.transacting;

    return Promise.mapSeries(tables, function (table) {
        var message = 'Adding column: ' + table + '.' + column;

        return transaction.schema.hasTable(table)
            .then(function (exists) {
                if (!exists) {
                    return Promise.reject(new Error('Table does not exist!'));
                }

                return transaction.schema.hasColumn(table, column);
            })
            .then(function (exists) {
                if (!exists) {
                    logger.info(message);
                    return commands.addColumn(table, column, transaction);
                } else {
                    logger.warn(message);
                }
            });
    });
};
