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

_private.wasSeen = (notification, user) => {
    if (notification.seenBy === undefined) {
        return notification.seen;
    } else {
        return notification.seenBy.includes(user.id);
    }
};

module.exports = {
    docName: 'notifications',

    browse: {
        permissions: true,
        query(frame) {
            let allNotifications = _private.fetchAllNotifications();
            allNotifications = _.orderBy(allNotifications, 'addedAt', 'desc');

            allNotifications = allNotifications.filter((notification) => {
                // NOTE: Filtering by version below is just a patch for bigger problem - notifications are not removed
                //       after Ghost update. Logic below should be removed when Ghost upgrade detection
                //       is done (https://github.com/TryGhost/Ghost/issues/10236) and notifications are
                //       be removed permanently on upgrade event.
                const ghost20RegEx = /Ghost 2.0 is now available/gi;

                // CASE: do not return old release notification
                if (notification.message && (!notification.custom || notification.message.match(ghost20RegEx))) {
                    let notificationVersion = notification.message.match(/(\d+\.)(\d+\.)(\d+)/);

                    if (notification.message.match(ghost20RegEx)) {
                        notificationVersion = '2.0.0';
                    } else if (notificationVersion){
                        notificationVersion = notificationVersion[0];
                    }

                    const blogVersion = ghostVersion.full.match(/^(\d+\.)(\d+\.)(\d+)/);

                    if (notificationVersion && blogVersion && semver.gt(notificationVersion, blogVersion[0])) {
                        return true;
                    } else {
                        return false;
                    }
                }

                return !_private.wasSeen(notification, frame.user);
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
            let notificationsToAdd = [];

            const allNotifications = _private.fetchAllNotifications();

            notificationsToCheck.forEach((notification) => {
                const isDuplicate = allNotifications.find((n) => {
                    return n.id === notification.id;
                });

                if (!isDuplicate) {
                    notificationsToAdd.push(Object.assign({}, defaults, notification, overrides));
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
            if (!notificationsToAdd.length) {
                return Promise.resolve();
            }

            const releaseNotificationsToAdd = notificationsToAdd.filter((notification) => {
                return !notification.custom;
            });

            // CASE: reorder notifications before save
            if (releaseNotificationsToAdd.length > 1) {
                notificationsToAdd = notificationsToAdd.filter((notification) => {
                    return notification.custom;
                });
                notificationsToAdd.push(_.orderBy(releaseNotificationsToAdd, 'created_at', 'desc')[0]);
            }

            return api.settings.edit({
                settings: [{
                    key: 'notifications',
                    // @NOTE: We always need to store all notifications!
                    value: allNotifications.concat(notificationsToAdd)
                }]
            }, internalContext).then(() => {
                return notificationsToAdd;
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

            if (_private.wasSeen(notificationToMarkAsSeen, frame.user)) {
                return Promise.resolve();
            }

            // @NOTE: We don't remove the notifications, because otherwise we will receive them again from the service.
            allNotifications[notificationToMarkAsSeenIndex].seen = true;

            if (!allNotifications[notificationToMarkAsSeenIndex].seenBy) {
                allNotifications[notificationToMarkAsSeenIndex].seenBy = [];
            }

            allNotifications[notificationToMarkAsSeenIndex].seenBy.push(frame.user.id);

            return api.settings.edit({
                settings: [{
                    key: 'notifications',
                    value: allNotifications
                }]
            }, internalContext).return();
        }
    },

    /**
     * Clears all notifications. Method used in tests only
     *
     * @private Not exposed over HTTP
     */
    destroyAll: {
        statusCode: 204,
        permissions: {
            method: 'destroy'
        },
        query() {
            const allNotifications = _private.fetchAllNotifications();

            allNotifications.forEach((notification) => {
                // @NOTE: We don't remove the notifications, because otherwise we will receive them again from the service.
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
