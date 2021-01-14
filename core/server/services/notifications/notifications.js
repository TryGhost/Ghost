const moment = require('moment-timezone');
const semver = require('semver');
const Promise = require('bluebird');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const ObjectId = require('bson-objectid');

class Notifications {
    constructor({settingsCache, i18n, ghostVersion}) {
        this.settingsCache = settingsCache;
        this.i18n = i18n;
        this.ghostVersion = ghostVersion;
    }

    fetchAllNotifications() {
        let allNotifications = this.settingsCache.get('notifications');

        allNotifications.forEach((notification) => {
            notification.addedAt = moment(notification.addedAt).toDate();
        });

        return allNotifications;
    }

    wasSeen(notification, user) {
        if (notification.seenBy === undefined) {
            return notification.seen;
        } else {
            return notification.seenBy.includes(user.id);
        }
    }

    browse({user}) {
        let allNotifications = this.fetchAllNotifications();
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

                const blogVersion = this.ghostVersion.full.match(/^(\d+\.)(\d+\.)(\d+)/);

                if (notificationVersion && blogVersion && semver.gt(notificationVersion, blogVersion[0])) {
                    return true;
                } else {
                    return false;
                }
            }

            return !this.wasSeen(notification, user);
        });

        return allNotifications;
    }

    add({notifications}) {
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

        let notificationsToCheck = notifications;
        let notificationsToAdd = [];

        const allNotifications = this.fetchAllNotifications();

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
            return {allNotifications, notificationsToAdd};
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

        return {allNotifications, notificationsToAdd};
    }

    destroy({notificationId, user}) {
        const allNotifications = this.fetchAllNotifications();

        const notificationToMarkAsSeen = allNotifications.find((notification) => {
            return notification.id === notificationId;
        });

        const notificationToMarkAsSeenIndex = allNotifications.findIndex((notification) => {
            return notification.id === notificationId;
        });

        if (notificationToMarkAsSeenIndex > -1 && !notificationToMarkAsSeen.dismissible) {
            return Promise.reject(new errors.NoPermissionError({
                message: this.i18n.t('errors.api.notifications.noPermissionToDismissNotif')
            }));
        }

        if (notificationToMarkAsSeenIndex < 0) {
            return Promise.reject(new errors.NotFoundError({
                message: this.i18n.t('errors.api.notifications.notificationDoesNotExist')
            }));
        }

        if (this.wasSeen(notificationToMarkAsSeen, user)) {
            return Promise.resolve();
        }

        // @NOTE: We don't remove the notifications, because otherwise we will receive them again from the service.
        allNotifications[notificationToMarkAsSeenIndex].seen = true;

        if (!allNotifications[notificationToMarkAsSeenIndex].seenBy) {
            allNotifications[notificationToMarkAsSeenIndex].seenBy = [];
        }

        allNotifications[notificationToMarkAsSeenIndex].seenBy.push(user.id);

        return allNotifications;
    }

    destroyAll() {
        const allNotifications = this.fetchAllNotifications();

        allNotifications.forEach((notification) => {
            // @NOTE: We don't remove the notifications, because otherwise we will receive them again from the service.
            notification.seen = true;
        });

        return allNotifications;
    }
}

module.exports = Notifications;
