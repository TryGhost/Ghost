const moment = require('moment-timezone');
const semver = require('semver');
const Promise = require('bluebird');
const _ = require('lodash');
const settingsCache = require('../../services/settings/cache');
const ghostVersion = require('../../lib/ghost-version');
const common = require('../../lib/common');
const ObjectId = require('bson-objectid');
const api = require('./index');
const internalContext = {context: {internal: true}};
const _private = {};

_private.fetchAllNotifications = () => {
    let allNotifications = settingsCache.get('notifications');

    allNotifications.forEach((notification) => {
        notification.addedAt = moment(notification.addedAt).toDate();
    });

    return allNotifications;
};

module.exports = {
    docName: 'notifications',

    browse: {
        permissions: true,
        query() {
            let allNotifications = _private.fetchAllNotifications();
            allNotifications = _.orderBy(allNotifications, 'addedAt', 'desc');

            allNotifications = allNotifications.filter((notification) => {
                // CASE: do not return old release notification
                if (!notification.custom && notification.message) {
                    const notificationVersion = notification.message.match(/(\d+\.)(\d+\.)(\d+)/),
                        blogVersion = ghostVersion.full.match(/^(\d+\.)(\d+\.)(\d+)/);

                    if (notificationVersion && blogVersion && semver.gt(notificationVersion[0], blogVersion[0])) {
                        return true;
                    } else {
                        return false;
                    }
                }

                return notification.seen !== true;
            });

            return allNotifications;
        }
    },

    add: {
        statusCode(result) {
            if (result.notifications.length) {
                return 201;
            } else {
                return 200;
            }
        },
        permissions: true,
        query(frame) {
            const defaults = {
                dismissible: true,
                location: 'bottom',
                status: 'alert',
                id: ObjectId.generate()
            };

            const overrides = {
                seen: false,
                addedAt: moment().toDate()
            };

            let notificationsToCheck = frame.data.notifications;
            let addedNotifications = [];

            const allNotifications = _private.fetchAllNotifications();

            notificationsToCheck.forEach((notification) => {
                const isDuplicate = allNotifications.find((n) => {
                    return n.id === notification.id;
                });

                if (!isDuplicate) {
                    addedNotifications.push(Object.assign({}, defaults, notification, overrides));
                }
            });

            const hasReleaseNotification = notificationsToCheck.find((notification) => {
                return !notification.custom;
            });

            // CASE: remove any existing release notifications if a new release notification comes in
            if (hasReleaseNotification) {
                _.remove(allNotifications, (el) => {
                    return !el.custom;
                });
            }

            // CASE: nothing to add, skip
            if (!addedNotifications.length) {
                return Promise.resolve();
            }

            const addedReleaseNotifications = addedNotifications.filter((notification) => {
                return !notification.custom;
            });

            // CASE: only latest release notification
            if (addedReleaseNotifications.length > 1) {
                addedNotifications = addedNotifications.filter((notification) => {
                    return notification.custom;
                });
                addedNotifications.push(_.orderBy(addedReleaseNotifications, 'created_at', 'desc')[0]);
            }

            return api.settings.edit({
                settings: [{
                    key: 'notifications',
                    value: allNotifications.concat(addedNotifications)
                }]
            }, internalContext).then(() => {
                return addedNotifications;
            });
        }
    },

    destroy: {
        statusCode: 204,
        options: ['notification_id'],
        validation: {
            options: {
                notification_id: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            const allNotifications = _private.fetchAllNotifications();

            const notificationToMarkAsSeen = allNotifications.find((notification) => {
                    return notification.id === frame.options.notification_id;
                }),
                notificationToMarkAsSeenIndex = allNotifications.findIndex((notification) => {
                    return notification.id === frame.options.notification_id;
                });

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

            return api.settings.edit({
                settings: [{
                    key: 'notifications',
                    value: allNotifications
                }]
            }, internalContext).return();
        }
    },

    destroyAll: {
        statusCode: 204,
        permissions: {
            method: 'destroy'
        },
        query() {
            const allNotifications = _private.fetchAllNotifications();

            allNotifications.forEach((notification) => {
                notification.seen = true;
            });

            return api.settings.edit({
                settings: [{
                    key: 'notifications',
                    value: allNotifications
                }]
            }, internalContext).return();
        }
    }
};
