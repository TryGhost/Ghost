var Promise = require('bluebird'),
    config = require('../../config'),
    api = require('../../api');

module.exports = function loadConfig() {
    var fetch = {
        configuration: api.configuration.read().then(function (res) { return res.configuration[0]; }),
        client: api.clients.read({slug: 'ghost-admin'}).then(function (res) { return res.clients[0]; }),
        ghostAuth: api.clients.read({slug: 'ghost-auth'})
            .then(function (res) { return res.clients[0]; })
            .catch(function () {
                return;
            })
    };

    return Promise.props(fetch).then(function renderIndex(result) {
        var configuration = result.configuration;

        configuration.clientId = {value: result.client.slug, type: 'string'};
        configuration.clientSecret = {value: result.client.secret, type: 'string'};

        if (result.ghostAuth && config.get('auth:type') === 'ghost') {
            configuration.ghostAuthId = {value: result.ghostAuth.uuid, type: 'string'};
        }

        return configuration;
    });
};
