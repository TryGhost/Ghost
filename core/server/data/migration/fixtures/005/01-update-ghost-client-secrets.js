// Update the `ghost-*` clients so that they definitely have a proper secret
var models  = require('../../../../models'),
    _       = require('lodash'),
    Promise = require('bluebird'),
    crypto  = require('crypto'),

    message = 'Updating client secret';

module.exports = function updateGhostClientsSecrets(options, logger) {
    return models.Clients.forge().query('where', 'secret', '=', 'not_available').fetch(options).then(function (results) {
        if (results.models.length === 0) {
            logger.warn(message);
            return;
        }

        return Promise.map(results.models, function mapper(client) {
            logger.info(message + ' (' + client.slug + ')');
            client.secret = crypto.randomBytes(6).toString('hex');

            return models.Client.edit(
                _.extend({}, client, {secret: crypto.randomBytes(6).toString('hex')}),
                _.extend({}, options, {id: client.id})
            );
        });
    });
};
