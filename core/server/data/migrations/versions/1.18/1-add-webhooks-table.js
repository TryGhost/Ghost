'use strict';

const logging = require('../../../../logging'),
    commands = require('../../../schema').commands,
    table = 'webhooks',
    message = 'Dropping table: ' + table;

module.exports.up = function addWebhooksTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (exists) {
                logging.warn(message);
                return Promise.resolve();
            }

            logging.info(message);
            return commands.createTable(table, connection);
        });
};

module.exports.down = function removeWebhooksTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                logging.warn(message);
                return Promise.resolve();
            }

            logging.info(message);
            return commands.deleteTable(table, connection);
        });
};
