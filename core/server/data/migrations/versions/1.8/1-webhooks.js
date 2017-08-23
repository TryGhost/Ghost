'use strict';

var Promise = require('bluebird'),
    commands = require('../../../schema').commands,
    logging = require('../../../../logging');

module.exports = function addWebhooksTable(options) {
    var transacting = options.transacting;

    logging.info('Creating table: webhooks');
    return commands.createTable('webhooks', transacting);
}
