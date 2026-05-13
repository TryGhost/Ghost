import semver from 'semver';
import ObjectId from 'bson-objectid';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import * as domain from './notification';
import type {NotificationRepository} from './repository';

const messages = {
    notificationDoesNotExist: 'Notification does not exist.'
};

const TWO_MONTHS_MS = 1000 * 60 * 60 * 24 * 60;

interface GhostVersion {
    full: string;
}

export interface NotificationInput {
    message: string;
    type?: 'info' | 'alert' | 'warn';
    custom?: boolean;
    dismissible?: boolean;
    top?: boolean;
    id?: string;
    template?: string;
    variables?: Record<string, string>;
}

export class NotificationService {
    private readonly repository: NotificationRepository;
    private readonly ghostVersion: GhostVersion;
    private readonly afterAdd?: (notification: domain.Notification) => Promise<void>;

    constructor(deps: {
        repository: NotificationRepository;
        ghostVersion: GhostVersion;
        afterAdd?: (notification: domain.Notification) => Promise<void>;
    }) {
        this.repository = deps.repository;
        this.ghostVersion = deps.ghostVersion;
        this.afterAdd = deps.afterAdd;
    }

    browse(userId: string): domain.Notification[] {
        const runningVersion = semver.clean(this.ghostVersion.full);
        if (!runningVersion) {
            return [];
        }
        return this.repository.findAll()
            .filter(n => !n.seenBy.includes(userId))
            .filter((n) => {
                const stamped = semver.clean(n.createdAtVersion);
                return stamped ? semver.gte(stamped, runningVersion) : false;
            })
            .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
    }

    async add(inputs: NotificationInput[]): Promise<domain.Notification[]> {
        const built = inputs.map(input => this.build(input));

        const incomingRelease = built.find(n => n.custom === false);
        if (incomingRelease) {
            await this.repository.deleteReleaseNotifications();
        }

        const added = await this.repository.saveAll(built);
        if (this.afterAdd) {
            for (const notification of added) {
                await this.afterAdd(notification);
            }
        }
        await this.repository.pruneOlderThan(new Date(Date.now() - TWO_MONTHS_MS));
        return added;
    }

    async dismiss(id: string, userId: string): Promise<void> {
        const all = this.repository.findAll();
        const target = all.find(n => n.id === id);
        if (!target) {
            throw new errors.NotFoundError({
                message: tpl(messages.notificationDoesNotExist)
            });
        }
        const dismissed = domain.dismiss(target, userId);
        const updated = all.map((n) => {
            if (n.id === id) {
                return dismissed;
            }
            return n;
        });
        await this.repository.replaceAll(updated);
    }

    async dismissAll(userId: string): Promise<void> {
        const updated = this.repository.findAll().map((n) => {
            if (!n.dismissible) {
                return n;
            }
            return domain.dismiss(n, userId);
        });
        await this.repository.replaceAll(updated);
    }

    private build(input: NotificationInput): domain.Notification {
        return domain.Notification.parse({
            ...input,
            id: input.id ?? new ObjectId().toHexString(),
            createdAtVersion: this.ghostVersion.full,
            addedAt: new Date()
        });
    }
}
