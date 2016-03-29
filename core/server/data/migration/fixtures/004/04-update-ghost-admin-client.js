// Update the `ghost-admin` client so that it has a proper secret
var models  = require('../../../../models'),
    _       = require('lodash'),
    crypto  = require('crypto'),

    adminClient = require('../utils').findModelFixtureEntry('Client', {slug: 'ghost-admin'}),
    message = 'Update ghost-admin client fixture';

module.exports = function updateGhostAdminClient(options, logger) {
    // ghost-admin should already exist from 003 version
    return models.Client.findOne({slug: adminClient.slug}).then(function (client) {
        if (client && (client.get('secret') === 'not_available' || client.get('status') !== 'enabled')) {
            logger.info(message);
            return models.Client.edit(
                _.extend({}, adminClient, {secret: crypto.randomBytes(6).toString('hex')}),
                _.extend({}, options, {id: client.id})
            );
        } else {
            logger.warn(message);
        }
    });
};
