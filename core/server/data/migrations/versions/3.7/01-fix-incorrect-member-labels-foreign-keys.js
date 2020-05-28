const logging = require('../../../../../shared/logging');
const commands = require('../../../schema').commands;

const table = 'members_labels';
const message1 = 'Adding table: ' + table;
const message2 = 'Dropping table: ' + table;

// 3.6.0 had an incorrect schema definition that created foreign key constraints for the wrong table.
//
// The schema.js is correct as of 3.7.0 and members_labels has not been used at this point
// so it's safe to drop and recreate the table to let knex do it's thing.

const dropTable = function (connection) {
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

const addTable = function (connection) {
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

module.exports.up = ({connection}) => {
    return dropTable(connection).then(() => addTable(connection));
};

// noop
module.exports.down = () => {
    return Promise.resolve();
};
