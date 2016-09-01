// # Notifications API
// RESTful API for creating notifications
var Promise            = require('bluebird'),
    _                  = require('lodash'),
    permissions        = require('../permissions'),
    errors             = require('../errors'),
    settings           = require('./settings'),
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
     *
     * If notification message already exists, we return the existing notification object.
     *
     * ```
     *  msg = { notifications: [{
         *      status: 'alert', // A String. Can be 'alert' or 'notification'
         *      type: 'error', // A String. Can be 'error', 'success', 'warn' or 'info'
         *      message: 'This is an error', // A string. Should fit in one line.
         *      location: '', // A String. Should be unique key to the notification, usually takes the form of "noun.verb.message", eg: "user.invite.already-invited"
         *      dismissible: true // A Boolean. Whether the notification is dismissible or not.
         *      custom: true // A Boolean. Whether the notification is a custom message intended for particular Ghost versions.
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
                addedNotifications = [], existingNotification;

            _.each(options.data.notifications, function (notification) {
                notificationCounter = notificationCounter + 1;

                notification = _.assign(defaults, notification, {
                    id: notificationCounter
                });

                existingNotification = _.find(notificationsStore, {message:notification.message});

                if (!existingNotification) {
                    notificationsStore.push(notification);
                    addedNotifications.push(notification);
                } else {
                    addedNotifications.push(existingNotification);
                }
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
     * @returns {Promise}
     */
    destroy: function destroy(options) {
        var tasks;

        /**
         * Adds the uuid of notification to "seenNotifications" array.
         * @param {Object} notification
         * @return {*|Promise}
         */
        function markAsSeen(notification) {
            var context = {internal: true};
            return settings.read({key: 'seenNotifications', context: context}).then(function then(response) {
                var seenNotifications = JSON.parse(response.settings[0].value);
                seenNotifications = _.uniqBy(seenNotifications.concat([notification.uuid]));
                return settings.edit({settings: [{key: 'seenNotifications', value: seenNotifications}]}, {context: context});
            });
        }

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

            if (notification.custom) {
                return markAsSeen(notification);
            }
        }

        tasks = [
            utils.validate('notifications', {opts: utils.idDefaultOptions}),
            handlePermissions,
            destroyNotification
        ];

        return pipeline(tasks, options);
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
