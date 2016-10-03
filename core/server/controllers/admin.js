var debug         = require('debug')('ghost:admin:controller'),
    _             = require('lodash'),
    Promise       = require('bluebird'),
    api           = require('../api'),
    config        = require('../config'),
    errors        = require('../errors'),
    updateCheck   = require('../update-check'),
    i18n          = require('../i18n'),
    adminControllers;

adminControllers = {
    // Route: index
    // Path: /ghost/
    // Method: GET
    index: function index(req, res) {
        debug('index called');
        /*jslint unparam:true*/

        function renderIndex() {
            var configuration,
                fetch = {
                    configuration: api.configuration.read().then(function (res) { return res.configuration[0]; }),
                    client: api.clients.read({slug: 'ghost-admin'}).then(function (res) { return res.clients[0]; }),
                    patronus: api.clients.read({slug: 'patronus'})
                        .then(function (res) { return res.clients[0]; })
                        .catch(function () {
                            return;
                        })
                };

            return Promise.props(fetch).then(function renderIndex(result) {
                configuration = result.configuration;

                configuration.clientId = {value: result.client.slug, type: 'string'};
                configuration.clientSecret = {value: result.client.secret, type: 'string'};

                if (result.patronus && config.get('auth:type') === 'patronus') {
                    configuration.ghostAuthId = {value: result.patronus.uuid, type: 'string'};
                }

                debug('rendering default template');
                res.render('default', {
                    configuration: configuration
                });
            });
        }

        updateCheck().then(function then() {
            return updateCheck.showUpdateNotification();
        }).then(function then(updateVersion) {
            if (!updateVersion) {
                return;
            }

            var notification = {
                status: 'alert',
                type: 'info',
                location: 'upgrade.new-version-available',
                dismissible: false,
                message: i18n.t('notices.controllers.newVersionAvailable',
                                {version: updateVersion, link: '<a href="http://support.ghost.org/how-to-upgrade/" target="_blank">Click here</a>'})};

            return api.notifications.browse({context: {internal: true}}).then(function then(results) {
                if (!_.some(results.notifications, {message: notification.message})) {
                    return api.notifications.add({notifications: [notification]}, {context: {internal: true}});
                }
            });
        }).finally(function noMatterWhat() {
            renderIndex();
        }).catch(errors.logError);
    }
};

module.exports = adminControllers;
