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

function markAsSeenBy(notification: StoredNotification, user: NotificationUser): void {
    notification.seen = true;
    if (!notification.seenBy) {
        notification.seenBy = [];
    }
    notification.seenBy.push(user.id);
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

        const existing = this.repository.getAll();
        const existingIds = new Set(existing.map(n => n.id));

        let toAdd: StoredNotification[] = notifications
            .filter(n => !(n.id && existingIds.has(n.id)))
            .map(n => Object.assign({}, defaults, n, overrides));

        // CASE: only the most recent incoming release notification is kept
        const incomingReleases = toAdd.filter(n => !n.custom);
        if (incomingReleases.length > 1) {
            toAdd = toAdd.filter(n => n.custom);
            toAdd.push(_.orderBy(incomingReleases, 'created_at', 'desc')[0]);
        }

        if (!toAdd.length) {
            return [];
        }

        // CASE: remove any existing release notifications if a new release notification comes in
        const incomingHasRelease = notifications.some(n => !n.custom);
        const kept = incomingHasRelease ? existing.filter(n => n.custom) : existing;

        await this.repository.replaceAll([...kept, ...toAdd]);

        return toAdd;
    }

    async destroy({notificationId, user}: {notificationId: string; user: NotificationUser}): Promise<void> {
        const notifications = this.repository.getAll();
        const notification = notifications.find(n => n.id === notificationId);

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
        markAsSeenBy(notification, user);

        await this.repository.replaceAll(notifications);
    }

    async destroyAll(): Promise<void> {
        const notifications = this.repository.getAll();
        if (!notifications.length) {
            return;
        }
        for (const notification of notifications) {
            notification.seen = true;
        }
        await this.repository.replaceAll(notifications);
    }
}
