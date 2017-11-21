'use strict';

const logging = require('../../../../logging'),
    commands = require('../../../schema').commands,
    table = 'webhooks',
    message = 'Adding table: ' + table;

module.exports = function addWebhooksTable(options) {
    let transacting = options.transacting;

    return transacting.schema.hasTable(table)
        .then(function (exists) {
            if (exists) {
                logging.warn(message);
                return Promise.resolve();
            }

            logging.info(message);
            return commands.createTable(table, transacting);
        });
};
