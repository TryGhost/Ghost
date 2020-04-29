const Promise = require('bluebird');
const common = require('../../../../lib/common');
const commands = require('../../../schema').commands;
const table = 'webhooks';
const message1 = 'Adding table: ' + table;
const message2 = 'Dropping table: ' + table;

module.exports.up = function addWebhooksTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (exists) {
                common.logging.warn(message1);
                return Promise.resolve();
            }

            common.logging.info(message1);
            return commands.createTable(table, connection);
        });
};

module.exports.down = function removeWebhooksTable(options) {
    let connection = options.connection;

    return connection.schema.hasTable(table)
        .then(function (exists) {
            if (!exists) {
                common.logging.warn(message2);
                return Promise.resolve();
            }

            common.logging.info(message2);
            return commands.deleteTable(table, connection);
        });
};
