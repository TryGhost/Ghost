var Promise  = require('bluebird'),
    commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'clients',
    columns  = ['redirection_uri', 'logo', 'status', 'type', 'description'];

module.exports = function addManyColumnsToClients(logger) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (exists) {
            return Promise.mapSeries(columns, function (column) {
                var message = 'Adding column: ' + table + '.' + column;
                return db.knex.schema.hasColumn(table, column).then(function (exists) {
                    if (!exists) {
                        logger.info(message);
                        return commands.addColumn(table, column);
                    } else {
                        logger.warn(message);
                    }
                });
            });
        } else {
            // @TODO: this should probably be an error
            logger.warn('Adding columns to table: ' + table);
        }
    });
};
