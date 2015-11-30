var _ = require('lodash'),
    api = require('./api');

function shouldAddNotification(currentNotifications, rawNotification, seenNotifications) {
    if (!rawNotification.uuid) {
        return false;
    }
    var hasBeenSeen = _.contains(seenNotifications, rawNotification.uuid);
    return !hasBeenSeen && !_.some(currentNotifications, {uuid: rawNotification.uuid});
}

function filterOutNotifications(currentNotifications, possibleNotifications) {
    var filteredNotifications = {
        notifications: []
    };

    return api.settings.read({
                context: {internal: true},
                key: 'seenNotifications'
            })
        .then(function (response) {
            var seenNotifications = JSON.parse(response.settings[0].value);
            _.each(possibleNotifications, function (rawNotification) {
                if (shouldAddNotification(currentNotifications, rawNotification, seenNotifications)) {
                    var defaultUpdateMessage = '<span>Hey there! ' + rawNotification.value + ' is available, visit <a href=\"https://ghost.org/download\">Ghost.org</a> to grab your copy now!</span>',
                    notification = {
                        dismissible: true,
                        location: 'bottom',
                        status: 'alert',
                        type: 'success',
                        uuid: rawNotification.uuid || rawNotification.id,
                        message: rawNotification.content || defaultUpdateMessage
                    };
                    filteredNotifications.notifications.push(notification);
                }
            });

            if (!_.some(currentNotifications, {status: 'upgrade'})) {
                // todo: temporary solution add logic for checking if any notifications exist
                filteredNotifications.notifications.push({
                    type: 'upgrade',
                    status: 'upgrade',
                    dismissible: false,
                    message: 'Ghost is available! Hot Damn. <a href="http://support.ghost.org/how-to-upgrade/" target="_blank">Click here</a> to upgrade.'
                });
            }

            return filteredNotifications;
        });
}

function process(possibleNotifications) {
    if (_.isEmpty(possibleNotifications)) {
        return;
    }

    return api.notifications.browse({context: {internal: true}})
        .then(function then(results) {
            return filterOutNotifications(results.notifications, possibleNotifications);
        })
        .then(function (notificationsToAdd) {
            if (!_.isEmpty(notificationsToAdd)) {
                return api.notifications.add(notificationsToAdd, {context: {internal: true}});
            }
        });
}

module.exports.process = process;
