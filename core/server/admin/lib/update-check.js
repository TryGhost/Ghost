var _ = require('lodash'),
    api = require('../../api'),
    i18n = require('../../i18n'),
    updateCheck = require('../../update-check');

module.exports = function updateCheckHandler() {
    return updateCheck().then(function then() {
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
                {
                    version: updateVersion,
                    link: '<a href="http://support.ghost.org/how-to-upgrade/" target="_blank">Click here</a>'
                })
        };

        return api.notifications.browse({context: {internal: true}}).then(function then(results) {
            if (!_.some(results.notifications, {message: notification.message})) {
                return api.notifications.add({notifications: [notification]}, {context: {internal: true}});
            }
        });
    });
};
