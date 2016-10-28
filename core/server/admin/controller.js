var debug         = require('debug')('ghost:admin:controller'),
    _             = require('lodash'),
    api           = require('../api'),
    logging       = require('../logging'),
    updateCheck   = require('../update-check'),
    i18n          = require('../i18n');

// Route: index
// Path: /ghost/
// Method: GET
module.exports = function adminController(req, res) {
    /*jslint unparam:true*/
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
            message: i18n.t('notices.controllers.newVersionAvailable',
                            {version: updateVersion, link: '<a href="http://support.ghost.org/how-to-upgrade/" target="_blank">Click here</a>'})};

        return api.notifications.browse({context: {internal: true}}).then(function then(results) {
            if (!_.some(results.notifications, {message: notification.message})) {
                return api.notifications.add({notifications: [notification]}, {context: {internal: true}});
            }
        });
    }).finally(function noMatterWhat() {
        res.render('default');
    }).catch(logging.logError);
};
