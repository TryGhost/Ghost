const common = require('../../../../lib/common');
const commands = require('../../../schema').commands;
const table = 'emails';
const message1 = 'Adding table: ' + table;
const message2 = 'Dropping table: ' + table;

module.exports.up = (options) => {
    const connection = options.connection;

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

module.exports.down = (options) => {
    const connection = options.connection;

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
