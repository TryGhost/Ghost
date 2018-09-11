var common = require('../../../../lib/common'),
    commands = require('../../../schema').commands,
    table = 'sessions',
    message1 = 'Adding table: ' + table,
    message2 = 'Dropping table: ' + table;

module.exports.up = function addSessionsTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (exists) {
                common.logging.warn(message1);
                return;
            }

            common.logging.info(message1);
            return commands.createTable(table, connection);
        });
};

module.exports.down = function removeSessionsTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                common.logging.warn(message2);
                return;
            }

            common.logging.info(message2);
            return commands.deleteTable(table, connection);
        });
};
