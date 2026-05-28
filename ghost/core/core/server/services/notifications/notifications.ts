import moment from 'moment-timezone';
import _ from 'lodash';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import ObjectId from 'bson-objectid';
import {NotificationRepository, StoredNotification} from './repository';

/* eslint-disable @typescript-eslint/no-require-imports -- semver and @tryghost/version ship no type declarations */
const semver = require('semver');
const ghostVersion = require('@tryghost/version');
/* eslint-enable @typescript-eslint/no-require-imports */

const messages = {
    noPermissionToDismissNotif: 'You do not have permission to dismiss this notification.',
    notificationDoesNotExist: 'Notification does not exist.'
};

interface NotificationUser {
    id: string;
}

interface IncomingNotification {
    id?: string;
    custom?: boolean;
    type?: string;
    message?: string;
    [key: string]: unknown;
}

export class Notifications {
    repository: NotificationRepository;

    constructor({repository}: {repository: NotificationRepository}) {
        this.repository = repository;
    }

    wasSeen(notification: StoredNotification, user: NotificationUser): boolean {
        if (notification.seenBy === undefined) {
            return Boolean(notification.seen);
        }
        return notification.seenBy.includes(user.id);
    }

    browse({user}: {user: NotificationUser}): StoredNotification[] {
        const blogVersion = semver.clean(ghostVersion.full);
        const allNotifications = _.orderBy(this.repository.getAll(), 'addedAt', 'desc');

        return allNotifications.filter((notification) => {
            if (notification.createdAtVersion && !this.wasSeen(notification, user)) {
                const cleaned = semver.clean(notification.createdAtVersion);
                return Boolean(cleaned && blogVersion && semver.gte(cleaned, blogVersion));
            }
            return !this.wasSeen(notification, user);
        });
    }

    async add({notifications}: {notifications: IncomingNotification[]}): Promise<StoredNotification[]> {
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

        let notificationsToAdd: StoredNotification[] = notifications
            .filter(notification => !(notification.id && this.repository.getById(notification.id)))
            .map(notification => Object.assign({}, defaults, notification, overrides));

        // CASE: remove any existing release notifications if a new release notification comes in
        if (notifications.some(notification => !notification.custom)) {
            for (const release of this.repository.getAll().filter(n => !n.custom)) {
                await this.repository.deleteById(release.id);
            }
        }

        if (!notificationsToAdd.length) {
            return [];
        }

        // CASE: only the most recent incoming release notification is kept
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

    async destroy({notificationId, user}: {notificationId: string; user: NotificationUser}): Promise<void> {
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

    async destroyAll(): Promise<void> {
        for (const notification of this.repository.getAll()) {
            notification.seen = true;
            await this.repository.edit(notification);
        }
    }
}
