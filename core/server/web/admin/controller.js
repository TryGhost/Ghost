var debug = require('ghost-ignition').debug('admin:controller'),
    _ = require('lodash'),
    path = require('path'),
    config = require('../../config'),
    api = require('../../api'),
    updateCheck = require('../../update-check'),
    common = require('../../lib/common');

// Route: index
// Path: /ghost/
// Method: GET
module.exports = function adminController(req, res) {
    debug('index called');

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
            message: common.i18n.t('notices.controllers.newVersionAvailable',
                {
                    version: updateVersion,
                    link: '<a href="https://docs.ghost.org/docs/upgrade" target="_blank">Click here</a>'
                })
        };

        return api.notifications.browse({context: {internal: true}}).then(function then(results) {
            if (!_.some(results.notifications, {message: notification.message})) {
                return api.notifications.add({notifications: [notification]}, {context: {internal: true}});
            }
        });
    }).finally(function noMatterWhat() {
        var defaultTemplate = config.get('env') === 'production' ? 'default-prod.html' : 'default.html',
            templatePath = path.resolve(config.get('paths').adminViews, defaultTemplate);

        res.sendFile(templatePath);
    }).catch(function (err) {
        common.logging.error(err);
    });
};
