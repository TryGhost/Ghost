var config        = require('../config'),
    _             = require('lodash'),
    when          = require('when'),
    api           = require('../api'),
    errors        = require('../errors'),
    updateCheck   = require('../update-check'),
    adminControllers;

adminControllers = {
    // Route: index
    // Path: /ghost/
    // Method: GET
    'index': function (req, res) {
        /*jslint unparam:true*/
        var userData,
        // config we need on the frontend
            frontConfig = {
                apps: config().apps,
                fileStorage: config().fileStorage
            };

        function renderIndex() {
            res.render('default', {
                user: userData,
                config: JSON.stringify(frontConfig)
            });
        }

        updateCheck().then(function () {
            return updateCheck.showUpdateNotification();
        }).then(function (updateAvailable) {
            if (!updateAvailable) {
                return when.resolve();
            }

            var notification = {
                type: 'success',
                location: 'top',
                dismissible: false,
                status: 'persistent',
                message: 'A new version of Ghost is available! Hot Damn. <a href="https://ghost.org/download">Upgrade now</a>'
            };

            return api.notifications.browse().then(function (results) {
                if (!_.some(results.notifications, { message: notification.message })) {
                    return api.notifications.add({ notifications: [notification] }, {context: {internal: true}});
                }
            });
        }).finally(function () {
            renderIndex();
        }).catch(errors.logError);
    }
};

module.exports = adminControllers;
