var commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'posts_tags',
    column   = 'sort_order',
    message  = 'Adding column: ' + table + '.' + column;

module.exports = function addSortOrderColumnToPostsTags(logger) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (exists) {
            return db.knex.schema.hasColumn(table, column).then(function (exists) {
                if (!exists) {
                    logger.info(message);
                    return commands.addColumn(table, column);
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
