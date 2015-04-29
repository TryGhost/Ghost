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
    index: function (req, res) {
        /*jslint unparam:true*/

        function renderIndex() {
            return api.configuration.browse().then(function (data) {
                var apiConfig = _.omit(data.configuration, function (value) {
                    return _.contains(['environment', 'database', 'mail', 'version'], value.key);
                });

                res.render('default', {
                    skip_google_fonts: config.isPrivacyDisabled('useGoogleFonts'),
                    configuration: apiConfig
                });
            });
        }

        updateCheck().then(function () {
            return updateCheck.showUpdateNotification();
        }).then(function (updateVersion) {
            if (!updateVersion) {
                return;
            }

            var notification = {
                type: 'upgrade',
                location: 'settings-about-upgrade',
                dismissible: false,
                status: 'persistent',
                message: 'Ghost ' + updateVersion + ' is available! Hot Damn. <a href="http://support.ghost.org/how-to-upgrade/" target="_blank">Click here</a> to upgrade.'
            };

            return api.notifications.browse({context: {internal: true}}).then(function (results) {
                if (!_.some(results.notifications, {message: notification.message})) {
                    return api.notifications.add({notifications: [notification]}, {context: {internal: true}});
                }
            });
        }).finally(function () {
            renderIndex();
        }).catch(errors.logError);
    }
};

module.exports = adminControllers;
