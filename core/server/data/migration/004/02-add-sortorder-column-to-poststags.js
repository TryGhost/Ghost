var Promise = require('bluebird'),
    commands = require('../../schema').commands,
    table = 'posts_tags',
    column = 'sort_order',
    message = 'Adding column: ' + table + '.' + column;

module.exports = function addSortOrderColumnToPostsTags(options, logger) {
    var transaction = options.transacting;

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
};
