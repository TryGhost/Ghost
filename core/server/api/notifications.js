// # Notifications API
// RESTful API for creating notifications
var Promise            = require('bluebird'),
    _                  = require('lodash'),
    uuid               = require('uuid'),
    moment             = require('moment'),
    permissions        = require('../permissions'),
    errors             = require('../errors'),
    SettingsAPI        = require('./settings'),
    utils              = require('./utils'),
    pipeline           = require('../utils/pipeline'),
    canThis            = permissions.canThis,
    i18n               = require('../i18n'),
    internalContext    = {context: {internal: true}},
    notifications,
    _private = {};

_private.fetchAllNotifications = function fetchAllNotifications() {
    var allNotifications;

    return SettingsAPI.read(_.merge({key: 'notifications'}, internalContext))
        .then(function (response) {
            allNotifications = JSON.parse(response.settings[0].value || []);

            _.each(allNotifications, function (notification) {
                notification.addedAt = moment(notification.addedAt).toDate();
            });

            return allNotifications;
        });
};

_private.publicResponse = function publicResponse(notificationsToReturn) {
    _.each(notificationsToReturn, function (notification) {
        delete notification.seen;
        delete notification.addedAt;
    });

    return {
        notifications: notificationsToReturn
    };
};

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
            return _private.fetchAllNotifications()
                .then(function (allNotifications) {
                    allNotifications = _.orderBy(allNotifications, 'addedAt', 'desc');

                    allNotifications = allNotifications.filter(function (notification) {
                        return notification.seen !== true;
                    });

                    return _private.publicResponse(allNotifications);
                });
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
                    status: 'alert',
                    id: uuid.v1()
                },
                overrides = {
                    seen: false,
                    addedAt: moment().valueOf()
                },
                notificationsToCheck = options.data.notifications,
                addedNotifications = [];

            return _private.fetchAllNotifications()
                .then(function (allNotifications) {
                    _.each(notificationsToCheck, function (notification) {
                        var isDuplicate = _.find(allNotifications, {id: notification.id});

                        if (!isDuplicate) {
                            addedNotifications.push(_.merge({}, defaults, notification, overrides));
                        }
                    });

                    // CASE: nothing to add, skip
                    if (!addedNotifications.length) {
                        return Promise.resolve();
                    }

                    return SettingsAPI.edit({
                        settings: [{
                            key: 'notifications',
                            value: allNotifications.concat(addedNotifications)
                        }]
                    }, internalContext);
                })
                .return(addedNotifications);
        }

        tasks = [
            utils.validate('notifications'),
            handlePermissions,
            saveNotifications
        ];

        return pipeline(tasks, object, options).then(function formatResponse(result) {
            return _private.publicResponse(result);
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
            return _private.fetchAllNotifications()
                .then(function (allNotifications) {
                    var notificationToMarkAsSeen = _.find(allNotifications, {id: options.id}),
                        notificationToMarkAsSeenIndex = _.findIndex(allNotifications, {id: options.id});

                    if (notificationToMarkAsSeenIndex > -1 && !notificationToMarkAsSeen.dismissible) {
                        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.api.notifications.noPermissionToDismissNotif')));
                    }

                    if (notificationToMarkAsSeenIndex < 0) {
                        return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.notifications.notificationDoesNotExist')));
                    }

                    if (notificationToMarkAsSeen.seen) {
                        return Promise.resolve();
                    }

                    allNotifications[notificationToMarkAsSeenIndex].seen = true;

                    return SettingsAPI.edit({
                        settings: [{
                            key: 'notifications',
                            value: allNotifications
                        }]
                    }, internalContext);
                })
                .return();
        }

        tasks = [
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
            return _private.fetchAllNotifications()
                .then(function (allNotifications) {
                    _.each(allNotifications, function (notification) {
                        notification.seen = true;
                    });

                    return SettingsAPI.edit({
                        settings: [{
                            key: 'notifications',
                            value: allNotifications
                        }]
                    }, internalContext);
                })
                .return();
        }, function () {
            return Promise.reject(new errors.NoPermissionError(i18n.t('errors.api.notifications.noPermissionToDestroyNotif')));
        });
    }
};

module.exports = notifications;
