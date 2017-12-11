// # Notifications API
// RESTful API for creating notifications
var Promise = require('bluebird'),
    _ = require('lodash'),
    ObjectId = require('bson-objectid'),
    pipeline = require('../utils/pipeline'),
    permissions = require('../permissions'),
    canThis = permissions.canThis,
    apiUtils = require('./utils'),
    common = require('../lib/common'),
    settingsAPI = require('./settings'),
    // Holds the persistent notifications
    notificationsStore = [],
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
            return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.api.notifications.noPermissionToBrowseNotif')}));
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
                return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.api.notifications.noPermissionToAddNotif')}));
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
                notification = _.assign(defaults, notification, {
                    id: ObjectId.generate()
                });

                existingNotification = _.find(notificationsStore, {message: notification.message});

                if (!existingNotification) {
                    notificationsStore.push(notification);
                    addedNotifications.push(notification);
                } else {
                    addedNotifications.push(existingNotification);
                }
            });

            return {
                notifications: addedNotifications
            };
        }

        tasks = [
            apiUtils.validate('notifications'),
            handlePermissions,
            saveNotifications
        ];

        return pipeline(tasks, object, options);
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
         * Adds the id of notification to "seen_notifications" array.
         * @param {Object} notification
         * @return {*|Promise}
         */
        function markAsSeen(notification) {
            var context = {internal: true};
            return settingsAPI.read({key: 'seen_notifications', context: context}).then(function then(response) {
                var seenNotifications = JSON.parse(response.settings[0].value);
                seenNotifications = _.uniqBy(seenNotifications.concat([notification.id]));
                return settingsAPI.edit({
                    settings: [{
                        key: 'seen_notifications',
                        value: seenNotifications
                    }]
                }, {context: context});
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
                return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.api.notifications.noPermissionToDestroyNotif')}));
            });
        }

        function destroyNotification(options) {
            var notification = _.find(notificationsStore, function (element) {
                return element.id === options.id;
            });

            if (notification && !notification.dismissible) {
                return Promise.reject(
                    new common.errors.NoPermissionError({message: common.i18n.t('errors.api.notifications.noPermissionToDismissNotif')})
                );
            }

            if (!notification) {
                return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.api.notifications.notificationDoesNotExist')}));
            }

            notificationsStore = _.reject(notificationsStore, function (element) {
                return element.id === options.id;
            });

            if (notification.custom) {
                return markAsSeen(notification);
            }
        }

        tasks = [
            apiUtils.validate('notifications', {opts: apiUtils.idDefaultOptions}),
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
            return notificationsStore;
        }, function (err) {
            return Promise.reject(new common.errors.NoPermissionError({
                err: err,
                context: common.i18n.t('errors.api.notifications.noPermissionToDestroyNotif')
            }));
        });
    }
};

module.exports = notifications;
