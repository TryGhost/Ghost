var when               = require('when'),
    _                  = require('lodash'),
    errors             = require('../errors'),

    // Holds the persistent notifications
    notificationsStore = [],
    // Holds the last used id
    notificationCounter = 0,
    notifications;

// ## Notifications
notifications = {

    browse: function browse() {
        return when({ 'notifications': notificationsStore });
    },

    destroy: function destroy(options) {
        var notification = _.find(notificationsStore, function (element) {
            return element.id === parseInt(options.id, 10);
        });

        if (notification && !notification.dismissable) {
            return when.reject(
                new errors.NoPermissionError('You do not have permission to dismiss this notification.')
            );
        }

        if (!notification) {
            return when.reject(new errors.NotFoundError('Notification does not exist.'));
        }

        notificationsStore = _.reject(notificationsStore, function (element) {
            return element.id === parseInt(options.id, 10);
        });
        // **returns:** a promise for the deleted object
        return when({notifications: [notification]});
    },

    destroyAll: function destroyAll() {
        notificationsStore = [];
        notificationCounter = 0;
        return when(notificationsStore);
    },

    /**
     * ### Add
     *
     *
     * **takes:** a notification object of the form
     * ```
     *  msg = {
     *      type: 'error', // this can be 'error', 'success', 'warn' and 'info'
     *      message: 'This is an error', // A string. Should fit in one line.
     *      location: 'bottom', // A string where this notification should appear. can be 'bottom' or 'top'
     *      dismissable: true // A Boolean. Whether the notification is dismissable or not.
     *  };
     * ```
     */
    add: function add(notification) {

        var defaults = {
            dismissable: true,
            location: 'bottom',
            status: 'persistent'
        };

        notificationCounter = notificationCounter + 1;

        notification = _.assign(defaults, notification, {
            id: notificationCounter
            //status: 'persistent'
        });

        notificationsStore.push(notification);
        // **returns:** a promise of the new notification object
        return when({ notifications: [notification]});
    }
};

module.exports = notifications;