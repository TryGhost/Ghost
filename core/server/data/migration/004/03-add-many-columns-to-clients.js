var Promise  = require('bluebird'),
    commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'clients',
    columns  = ['redirection_uri', 'logo', 'status', 'type', 'description'];

module.exports = function addManyColumnsToClients(logInfo) {
    return db.knex.schema.hasTable(table).then(function (exists) {
        if (exists) {
            return Promise.mapSeries(columns, function (column) {
                return db.knex.schema.hasColumn(table, column).then(function (exists) {
                    if (!exists) {
                        logInfo('Adding column: ' + table + '.' + column);
                        return commands.addColumn(table, column);
                    }
                });
            });
        }
    });
};
