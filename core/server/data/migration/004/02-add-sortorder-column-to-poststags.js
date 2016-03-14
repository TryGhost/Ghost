var commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'posts_tags',
    column   = 'sort_order';

module.exports = function addSortOrderColumnToPostsTags(logInfo) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (exists) {
            return db.knex.schema.hasColumn(table, column).then(function (exists) {
                if (!exists) {
                    logInfo('Adding column: ' + table + '.' + column);
                    return commands.addColumn(table, column);
                }
            });
        }
    });
};
