const logging = require('../../../../../shared/logging');
const commands = require('../../../schema').commands;
const table = 'actions';
const message1 = `Adding table: ${table}`;
const message2 = `Dropping table: ${table}`;

module.exports.up = (options) => {
    const connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (exists) {
                logging.warn(message1);
                return;
            }

            logging.info(message1);
            return commands.createTable(table, connection);
        });
};

module.exports.down = (options) => {
    const connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                logging.warn(message2);
                return;
            }

            logging.info(message2);
            return commands.deleteTable(table, connection);
        });
};
