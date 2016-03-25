var Promise  = require('bluebird'),
    commands = require('../../schema').commands,
    db       = require('../../db'),

    tables    = ['posts', 'tags', 'users'],
    column   = 'visibility';

module.exports = function addVisibilityColumnToKeyTables(logger) {
    return Promise.mapSeries(tables, function (table) {
        var message  = 'Adding column: ' + table + '.' + column;
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
    });
};
