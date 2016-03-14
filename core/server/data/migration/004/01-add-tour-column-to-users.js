var commands = require('../../schema').commands,
    db       = require('../../db'),

    table    = 'users',
    column   = 'tour';

module.exports = function addTourColumnToUsers(logInfo) {
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
