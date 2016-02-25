// Update the `ghost-admin` client so that it has a proper secret
var models  = require('../../../../models'),
    _       = require('lodash'),
    Promise = require('bluebird'),
    crypto  = require('crypto'),

    adminClient = require('../fixtures').models.Client[0];

module.exports = function updateGhostAdminClient(options, logInfo) {
    // ghost-admin should already exist from 003 version
    return models.Client.findOne({slug: adminClient.slug}).then(function (client) {
        if (client) {
            logInfo('Update ghost-admin client fixture');
            return models.Client.edit(
                _.extend({}, adminClient, {secret: crypto.randomBytes(6).toString('hex')}),
                _.extend({}, options, {id: client.id})
            );
        }
        return Promise.resolve();
    });
};
