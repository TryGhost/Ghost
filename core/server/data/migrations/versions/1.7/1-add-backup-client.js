const models = require('../../../../models'),
    common = require('../../../../lib/common'),
    fixtures = require('../../../schema/fixtures'),
    _ = require('lodash'),
    backupClient = fixtures.utils.findModelFixtureEntry('Client', {slug: 'ghost-backup'}),
    Promise = require('bluebird'),
    message = 'Adding "Ghost Backup" fixture into clients table',
    message1 = 'Removing "Ghost Backup" fixture into clients table';

module.exports.config = {
    transaction: true
};

module.exports.up = function addGhostBackupClient(options) {
    var localOptions = _.merge({
        context: {internal: true}
    }, options);

    return models.Client
        .findOne({slug: backupClient.slug}, localOptions)
        .then(function (client) {
            if (!client) {
                common.logging.info(message);
                return fixtures.utils.addFixturesForModel({name: 'Client', entries: [backupClient]}, localOptions);
            } else {
                common.logging.warn(message);
                return Promise.resolve();
            }
        });
};

module.exports.down = function removeGhostBackupClient(options) {
    var localOptions = _.merge({
        context: {internal: true}
    }, options);

    return models.Client
        .findOne({slug: backupClient.slug}, localOptions)
        .then(function (client) {
            if (client) {
                common.logging.info(message1);
                return fixtures.utils.removeFixturesForModel({name: 'Client', entries: [backupClient]}, localOptions);
            } else {
                common.logging.warn(message1);
                return Promise.resolve();
            }
        });
};
