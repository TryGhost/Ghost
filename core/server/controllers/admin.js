var Promise       = require('bluebird'),
    api           = require('../api'),
    errors        = require('../errors'),
    updateCheck   = require('../update-check'),
    adminControllers;

adminControllers = {
    // Route: index
    // Path: /ghost/
    // Method: GET
    index: function index(req, res) {
        /*jslint unparam:true*/

        function renderIndex() {
            var configuration,
                fetch = {
                    configuration: api.configuration.read().then(function (res) { return res.configuration[0]; }),
                    client: api.clients.read({slug: 'ghost-admin'}).then(function (res) { return res.clients[0]; })
                };

            return Promise.props(fetch).then(function renderIndex(result) {
                configuration = result.configuration;

                configuration.clientId = {value: result.client.slug, type: 'string'};
                configuration.clientSecret = {value: result.client.secret, type: 'string'};

                res.render('default', {
                    configuration: configuration
                });
            });
        }

        updateCheck().finally(function noMatterWhat() {
            renderIndex();
        }).catch(errors.logError);
    }
};

module.exports = adminControllers;
