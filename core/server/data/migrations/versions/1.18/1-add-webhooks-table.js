'use strict';

const logging = require('../../../../logging'),
    commands = require('../../../schema').commands,
    table = 'webhooks',
    message1 = 'Adding table: ' + table,
    message2 = 'Dropping table: ' + table;

module.exports.up = function addWebhooksTable(options) {
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

module.exports.down = function removeWebhooksTable(options) {
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
