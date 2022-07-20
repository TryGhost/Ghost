const moment = require('moment-timezone');
const semver = require('semver');
const Promise = require('bluebird');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const ghostVersion = require('@tryghost/version');
const tpl = require('@tryghost/tpl');
const ObjectId = require('bson-objectid');

const messages = {
    noPermissionToDismissNotif: 'You do not have permission to dismiss this notification.',
    notificationDoesNotExist: 'Notification does not exist.'
};

class Notifications {
    /**
     *
     * @param {Object} options
     * @param {Object} options.settingsCache - settings cache instance
     * @param {Object} options.SettingsModel - Ghost's Setting model instance
     */
    constructor({settingsCache, SettingsModel}) {
        this.settingsCache = settingsCache;
        this.SettingsModel = SettingsModel;
    }

    /**
     * @returns {Object[]} - all notifications
     */
    fetchAllNotifications() {
        let allNotifications = this.settingsCache.get('notifications');

        // @TODO: this check can be removed to improve read operation perf. It's here only because
        //        reads are done often and this gives a possibility to self-heal any broken records.
        //        The check can be removed/moved to write operations once we have the guardrails on that
        //        level long enough and are confident there's no broken data in the DB (e.g few minors after Ghost v5?)
        if (!this.areNotificationsValid(allNotifications)) {
            // Not using "await" here and doing the "fire-and-forget" because the result is know beforehand
            // We only care for the notifications to ge into "correct" state eventually and work properly with next request
            this.dangerousDestroyAll();
            return [];
        }

        allNotifications.forEach((notification) => {
            notification.addedAt = moment(notification.addedAt).toDate();
        });

        return allNotifications;
    }

    /**
     *
     * @param {Object[]} notifications - objects to check if they have valid notifications array format
     *
     * @returns {boolean}
     */
    areNotificationsValid(notifications) {
        if (!(_.isArray(notifications))) {
            return false;
        }

        return true;
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
        const blogVersion = ghostVersion.full.match(/^(\d+\.)(\d+\.)(\d+)/);

        allNotifications = allNotifications.filter((notification) => {
            if (notification.createdAtVersion && !this.wasSeen(notification, user)) {
                return semver.gte(notification.createdAtVersion, blogVersion[0]);
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
                    let notificationVersion = notification.message.match(/(\d+\.)(\d+\.)(\d+)/);

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

                    if (notificationVersion && blogVersion && semver.gt(notificationVersion, blogVersion[0])) {
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

    add({notifications}) {
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

    /**
     *
     * @param {Object} options
     * @param {string} options.notificationId - UUID of the notification
     * @param {Object} options.user
     * @param {string} options.user.id
     *
     * @returns {Promise<Object[]>}
     */
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
                message: tpl(messages.noPermissionToDismissNotif)
            }));
        }

        if (notificationToMarkAsSeenIndex < 0) {
            return Promise.reject(new errors.NotFoundError({
                message: tpl(messages.notificationDoesNotExist)
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

    /**
     * Comparing to destroyAll method this one wipes out the notifications data!
     * It is only to be used in a situation when notifications data has been corrupted and
     * there's a need to self-heal. Wiping out notifications will fetch some of the notifications
     * again and repopulate the array with correct data.
     */
    async dangerousDestroyAll() {
        // Same default as defined in "default-settings.json"
        const defaultValue = '[]';

        return this.SettingsModel.edit([{
            key: 'notifications',
            value: defaultValue
        }], {context: {internal: true}});
    }
}

module.exports = Notifications;
