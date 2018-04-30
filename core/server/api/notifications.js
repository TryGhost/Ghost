// # Notifications API
// RESTful API for creating notifications

const Promise = require('bluebird'),
    _ = require('lodash'),
    semver = require('semver'),
    moment = require('moment'),
    ObjectId = require('bson-objectid'),
    ghostVersion = require('../lib/ghost-version'),
    pipeline = require('../lib/promise/pipeline'),
    permissions = require('../services/permissions'),
    localUtils = require('./utils'),
    common = require('../lib/common'),
    SettingsAPI = require('./settings'),
    internalContext = {context: {internal: true}},
    canThis = permissions.canThis;

let notifications,
    _private = {};

_private.fetchAllNotifications = function fetchAllNotifications() {
    let allNotifications;

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
 * **See:** [API Methods](constants.js.html#api%20methods)
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
                        // CASE: do not return old release notification
                        if (!notification.custom && notification.message) {
                            let notificationVersion = notification.message.match(/(\d+\.)(\d+\.)(\d+)/);
                            let blogVersion = ghostVersion.full.match(/^(\d+\.)(\d+\.)(\d+)/);

                            if (notificationVersion && blogVersion && semver.gt(notificationVersion[0], blogVersion[0])) {
                                return true;
                            } else {
                                return false;
                            }
                        }

                        return notification.seen !== true;
                    });

                    return _private.publicResponse(allNotifications);
                });
        }, function () {
            return Promise.reject(new common.errors.NoPermissionError({
                message: common.i18n.t('errors.api.notifications.noPermissionToBrowseNotif')
            }));
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
                return Promise.reject(new common.errors.NoPermissionError({
                    message: common.i18n.t('errors.api.notifications.noPermissionToAddNotif')
                }));
            });
        }

        /**
         * ### Save Notifications
         * Save the notifications
         * @param {Object} options
         * @returns {Object} options
         */
        function saveNotifications(options) {
            let defaults = {
                    dismissible: true,
                    location: 'bottom',
                    status: 'alert',
                    id: ObjectId.generate()
                },
                overrides = {
                    seen: false,
                    addedAt: moment().toDate()
                },
                notificationsToCheck = options.data.notifications,
                addedNotifications = [];

            return _private.fetchAllNotifications()
                .then(function (allNotifications) {
                    _.each(notificationsToCheck, function (notification) {
                        let isDuplicate = _.find(allNotifications, {id: notification.id});

                        if (!isDuplicate) {
                            addedNotifications.push(_.merge({}, defaults, notification, overrides));
                        }
                    });

                    let hasReleaseNotification = _.find(notificationsToCheck, {custom: false});

                    // CASE: remove any existing release notifications if a new release notification comes in
                    if (hasReleaseNotification) {
                        _.remove(allNotifications, function (el) {
                            return !el.custom;
                        });
                    }

                    // CASE: nothing to add, skip
                    if (!addedNotifications.length) {
                        return Promise.resolve();
                    }

                    let addedReleaseNotifications = _.filter(addedNotifications, {custom: false});

                    // CASE: only latest release notification
                    if (addedReleaseNotifications.length > 1) {
                        addedNotifications = _.filter(addedNotifications, {custom: true});
                        addedNotifications.push(_.orderBy(addedReleaseNotifications, 'created_at', 'desc')[0]);
                    }

                    return SettingsAPI.edit({
                        settings: [{
                            key: 'notifications',
                            value: allNotifications.concat(addedNotifications)
                        }]
                    }, internalContext);
                })
                .then(function () {
                    return _private.publicResponse(addedNotifications);
                });
        }

        tasks = [
            localUtils.validate('notifications'),
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
        let tasks;

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
                return Promise.reject(new common.errors.NoPermissionError({
                    message: common.i18n.t('errors.api.notifications.noPermissionToDestroyNotif')
                }));
            });
        }

        function destroyNotification(options) {
            return _private.fetchAllNotifications()
                .then(function (allNotifications) {
                    let notificationToMarkAsSeen = _.find(allNotifications, {id: options.id}),
                        notificationToMarkAsSeenIndex = _.findIndex(allNotifications, {id: options.id});

                    if (notificationToMarkAsSeenIndex > -1 && !notificationToMarkAsSeen.dismissible) {
                        return Promise.reject(new common.errors.NoPermissionError({
                            message: common.i18n.t('errors.api.notifications.noPermissionToDismissNotif')
                        }));
                    }

                    if (notificationToMarkAsSeenIndex < 0) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.notifications.notificationDoesNotExist')
                        }));
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
        return canThis(options.context).destroy.notification()
            .then(function () {
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
            }, function (err) {
                return Promise.reject(new common.errors.NoPermissionError({
                    err: err,
                    context: common.i18n.t('errors.api.notifications.noPermissionToDestroyNotif')
                }));
            });
    }
};

module.exports = notifications;
