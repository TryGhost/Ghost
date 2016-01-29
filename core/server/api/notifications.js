// # Notifications API
// RESTful API for creating notifications
var Promise            = require('bluebird'),
    _                  = require('lodash'),
    permissions        = require('../permissions'),
    errors             = require('../errors'),
    utils              = require('./utils'),
    pipeline           = require('../utils/pipeline'),
    canThis            = permissions.canThis,
    i18n               = require('../i18n'),

    // Holds the persistent notifications
    notificationsStore = [],
    // Holds the last used id
    notificationCounter = 0,
    notifications;

/**
 * ## Notification API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
notifications = {

    /**
     * ### Browse
     * Fetch all notifications
     * @returns {Promise(Notifications)}
     */
    browse: function browse(options) {
        return canThis(options.context).browse.notification().then(function () {
            return {notifications: notificationsStore};
        }, function () {
            return Promise.reject(new errors.NoPermissionError(i18n.t('errors.api.notifications.noPermissionToBrowseNotif')));
        });
    },

    /**
     * ### Add
     *
     *
     * **takes:** a notification object of the form
     * ```
     *  msg = { notifications: [{
         *      type: 'error', // this can be 'error', 'success', 'warn' and 'info'
         *      message: 'This is an error', // A string. Should fit in one line.
         *      location: 'bottom', // A string where this notification should appear. can be 'bottom' or 'top'
         *      dismissible: true // A Boolean. Whether the notification is dismissible or not.
         *  }] };
     * ```
     */
    add: function add(object, options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            if (permissions.parseContext(options.context).internal) {
                return Promise.resolve(options);
            }

            return canThis(options.context).add.notification().then(function () {
                return options;
            }, function () {
                return Promise.reject(new errors.NoPermissionError(i18n.t('errors.api.notifications.noPermissionToAddNotif')));
            });
        }

        /**
         * ### Save Notifications
         * Save the notifications
         * @param {Object} options
         * @returns {Object} options
         */
        function saveNotifications(options) {
            var defaults = {
                    dismissible: true,
                    location: 'bottom',
                    status: 'alert'
                },
                addedNotifications = [];

            _.each(options.data.notifications, function (notification) {
                notificationCounter = notificationCounter + 1;

                notification = _.assign(defaults, notification, {
                    id: notificationCounter
                    // status: 'alert'
                });

                notificationsStore.push(notification);
                addedNotifications.push(notification);
            });

            return addedNotifications;
        }

        tasks = [
            utils.validate('notifications'),
            handlePermissions,
            saveNotifications
        ];

        return pipeline(tasks, object, options).then(function formatResponse(result) {
            return {notifications: result};
        });
    },

    /**
     * ### Destroy
     * Remove a specific notification
     *
     * @param {{id (required), context}} options
     * @returns {Promise(Notifications)}
     */
    destroy: function destroy(options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).destroy.notification().then(function () {
                return options;
            }, function () {
                return Promise.reject(new errors.NoPermissionError(i18n.t('errors.api.notifications.noPermissionToDestroyNotif')));
            });
        }

        function destroyNotification(options) {
            var notification = _.find(notificationsStore, function (element) {
                return element.id === parseInt(options.id, 10);
            });

            if (notification && !notification.dismissible) {
                return Promise.reject(
                    new errors.NoPermissionError(i18n.t('errors.api.notifications.noPermissionToDismissNotif'))
                );
            }

            if (!notification) {
                return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.notifications.notificationDoesNotExist')));
            }

            notificationsStore = _.reject(notificationsStore, function (element) {
                return element.id === parseInt(options.id, 10);
            });
            notificationCounter = notificationCounter - 1;

            return notification;
        }

        tasks = [
            utils.validate('notifications', {opts: utils.idDefaultOptions}),
            handlePermissions,
            destroyNotification
        ];

        return pipeline(tasks, options).then(function formatResponse(result) {
            return {notifications: [result]};
        });
    },

    /**
     * ### DestroyAll
     * Clear all notifications, used for tests
     *
     * @private Not exposed over HTTP
     * @returns {Promise}
     */
    destroyAll: function destroyAll(options) {
        return canThis(options.context).destroy.notification().then(function () {
            notificationsStore = [];
            notificationCounter = 0;

            return notificationsStore;
        }, function () {
            return Promise.reject(new errors.NoPermissionError(i18n.t('errors.api.notifications.noPermissionToDestroyNotif')));
        });
    }
};

module.exports = notifications;
