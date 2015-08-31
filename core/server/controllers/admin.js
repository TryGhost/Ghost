var _             = require('lodash'),
    api           = require('../api'),
    errors        = require('../errors'),
    updateCheck   = require('../update-check'),
    config        = require('../config'),
    adminControllers;

adminControllers = {
    // Route: index
    // Path: /ghost/
    // Method: GET
    index: function index(req, res) {
        /*jslint unparam:true*/

        function renderIndex() {
            var configuration;
            return api.configuration.browse().then(function then(data) {
                configuration = data.configuration;
            }).then(function getAPIClient() {
                return api.clients.read({slug: 'ghost-admin'});
            }).then(function renderIndex(adminClient) {
                configuration.push({key: 'clientId', value: adminClient.clients[0].slug});
                configuration.push({key: 'clientSecret', value: adminClient.clients[0].secret});

                var apiConfig = _.omit(configuration, function omit(value) {
                    return _.contains(['environment', 'database', 'mail', 'version'], value.key);
                });

                res.render('default', {
                    skip_google_fonts: config.isPrivacyDisabled('useGoogleFonts'),
                    configuration: apiConfig
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
                type: 'upgrade',
                location: 'settings-about-upgrade',
                dismissible: false,
                status: 'alert',
                message: 'Ghost ' + updateVersion + ' is available! Hot Damn. <a href="http://support.ghost.org/how-to-upgrade/" target="_blank">Click here</a> to upgrade.'
            };

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
