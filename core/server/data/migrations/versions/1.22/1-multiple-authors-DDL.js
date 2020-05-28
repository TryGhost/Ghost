const Promise = require('bluebird');
const logging = require('../../../../../shared/logging');
const commands = require('../../../schema').commands;
const table = 'posts_authors';
const message1 = 'Adding table: ' + table;
const message2 = 'Dropping table: ' + table;

module.exports.up = function addMultipleAuthorsTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (exists) {
                logging.warn(message1);
                return Promise.resolve();
            }

            logging.info(message1);
            return commands.createTable(table, connection);
        });
};

module.exports.down = function removeMultipleAuthorsTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                logging.warn(message2);
                return Promise.resolve();
            }

            logging.info(message2);
            return commands.deleteTable(table, connection);
        });
};
