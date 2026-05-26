const moment = require('moment-timezone');
const semver = require('semver');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const ghostVersion = require('@tryghost/version');
const tpl = require('@tryghost/tpl');
const ObjectId = require('bson-objectid').default;

const messages = {
    noPermissionToDismissNotif: 'You do not have permission to dismiss this notification.',
    notificationDoesNotExist: 'Notification does not exist.'
};

class Notifications {
    /**
     * @param {Object} options
     * @param {import('./repository').NotificationRepository} options.repository
     */
    constructor({repository}) {
        this.repository = repository;
    }

    wasSeen(notification, user) {
        if (notification.seenBy === undefined) {
            return notification.seen;
        } else {
            return notification.seenBy.includes(user.id);
        }
    }

    browse({user}) {
        let allNotifications = this.repository.getAll();
        allNotifications = _.orderBy(allNotifications, 'addedAt', 'desc');
        const blogVersion = semver.clean(ghostVersion.full);

        allNotifications = allNotifications.filter((notification) => {
            if (notification.createdAtVersion && !this.wasSeen(notification, user)) {
                return semver.gte(semver.clean(notification.createdAtVersion), blogVersion);
            } else {
                // NOTE: Filtering by version below is just a patch for bigger problem - notifications are not removed
                //       after Ghost update. Logic below should be removed when Ghost upgrade detection
                //       is done (https://github.com/TryGhost/Ghost/issues/10236) and notifications are
                //       be removed permanently on upgrade event.
                // NOTE: this whole else block can be removed with the first version after Ghost v5.0
                //       as the "createdAtVersion" mechanism will be enough to detect major version updates.
                const ghostMajorRegEx = /Ghost (?<major>\d).0 is now available/gi;
                const ghostSec43 = /GHSA-9fgx-q25h-jxrg/gi;

                // CASE: do not return old release notification
                if (notification.message
                    && (!notification.custom || notification.message.match(ghostMajorRegEx) || notification.message.match(ghostSec43))) {
                    let notificationVersion = notification.message.match(/(\d+\.\d+\.\d+)/);

                    if (!notificationVersion && notification.message.match(ghostSec43)) {
                        // Treating "GHSA-9fgx-q25h-jxrg" notification as 4.3.3 because there's no way to detect version
                        // from it's message. In the future we should consider having a separate field with version
                        // coming with each notification
                        notificationVersion = ['4.3.3'];
                    }

                    const ghostMajorMatch = ghostMajorRegEx.exec(notification.message);
                    if (ghostMajorMatch && ghostMajorMatch.groups && ghostMajorMatch.groups.major) {
                        notificationVersion = `${ghostMajorMatch.groups.major}.0.0`;
                    } else if (notificationVersion){
                        notificationVersion = notificationVersion[0];
                    }

                    if (notificationVersion && blogVersion && semver.gt(notificationVersion, blogVersion)) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }

            return !this.wasSeen(notification, user);
        });

        return allNotifications;
    }

    async add({notifications}) {
        const defaults = {
            dismissible: true,
            location: 'bottom',
            status: 'alert',
            id: ObjectId().toHexString(),
            createdAtVersion: ghostVersion.full
        };

        const overrides = {
            seen: false,
            addedAt: moment().toDate()
        };

        const existing = this.repository.getAll();

        let notificationsToAdd = [];
        notifications.forEach((notification) => {
            const isDuplicate = existing.find(n => n.id === notification.id);
            if (!isDuplicate) {
                notificationsToAdd.push(Object.assign({}, defaults, notification, overrides));
            }
        });

        // CASE: remove any existing release notifications if a new release notification comes in
        const hasReleaseNotification = notifications.find(notification => !notification.custom);
        if (hasReleaseNotification) {
            for (const releaseNotification of existing.filter(n => !n.custom)) {
                await this.repository.deleteById(releaseNotification.id);
            }
        }

        if (!notificationsToAdd.length) {
            return [];
        }

        // CASE: reorder notifications before save
        const releaseNotificationsToAdd = notificationsToAdd.filter(notification => !notification.custom);
        if (releaseNotificationsToAdd.length > 1) {
            notificationsToAdd = notificationsToAdd.filter(notification => notification.custom);
            notificationsToAdd.push(_.orderBy(releaseNotificationsToAdd, 'created_at', 'desc')[0]);
        }

        for (const notification of notificationsToAdd) {
            await this.repository.add(notification);
        }

        return notificationsToAdd;
    }

    async destroy({notificationId, user}) {
        const notification = this.repository.getById(notificationId);

        if (!notification) {
            throw new errors.NotFoundError({
                message: tpl(messages.notificationDoesNotExist)
            });
        }

        if (!notification.dismissible) {
            throw new errors.NoPermissionError({
                message: tpl(messages.noPermissionToDismissNotif)
            });
        }

        if (this.wasSeen(notification, user)) {
            return;
        }

        // @NOTE: We mark as seen rather than remove, otherwise the notification
        //        would be served again on the next update check.
        notification.seen = true;
        if (!notification.seenBy) {
            notification.seenBy = [];
        }
        notification.seenBy.push(user.id);

        await this.repository.edit(notification);
    }

    async destroyAll() {
        for (const notification of this.repository.getAll()) {
            notification.seen = true;
            await this.repository.edit(notification);
        }
    }
}

module.exports = Notifications;
