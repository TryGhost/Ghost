'use strict';

const models = require('../../../../models'),
    logging = require('../../../../logging'),
    fixtures = require('../../../schema/fixtures'),
    _ = require('lodash'),
    backupClient = fixtures.utils.findModelFixtureEntry('Client', {slug: 'ghost-backup'}),
    Promise = require('bluebird'),
    message = 'Adding "Ghost Backup" fixture into clients table';

module.exports = function addGhostBackupClient(options) {
    var localOptions = _.merge({
        context: {internal: true}
    }, options);

    return models.Client
        .findOne({slug: backupClient.slug}, localOptions)
        .then(function (client) {
            if (!client) {
                logging.info(message);
                return fixtures.utils.addFixturesForModel({name: 'Client', entries: [backupClient]}, localOptions);
            } else {
                logging.warn(message);
                return Promise.resolve();
            }
        });
};
