import semver from 'semver';
import ObjectId from 'bson-objectid';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import * as domain from './notification';
import type {NotificationRepository} from './repository';

const messages = {
    notificationDoesNotExist: 'Notification does not exist.'
};

interface GhostVersion {
    full: string;
}

export interface NotificationInput {
    message: string;
    custom: boolean;
    type?: domain.NotificationType;
    dismissible?: boolean;
    top?: boolean;
    id?: string;
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

        if (built.some(n => !n.custom)) {
            const releaseIds = this.repository.findAll()
                .filter(n => !n.custom)
                .map(n => n.id);
            await this.repository.delete(releaseIds);
        }

        const added: domain.Notification[] = [];
        for (const notification of built) {
            if (this.repository.findById(notification.id)) {
                continue;
            }
            await this.repository.save(notification);
            added.push(notification);
        }

        if (this.afterAdd) {
            for (const notification of added) {
                await this.afterAdd(notification);
            }
        }
        return added;
    }

    async dismiss(id: string, userId: string): Promise<void> {
        if (!this.repository.findById(id)) {
            throw new errors.NotFoundError({
                message: tpl(messages.notificationDoesNotExist)
            });
        }
        await this.repository.update(id, n => domain.dismiss(n, userId));
    }

    async dismissAll(userId: string): Promise<void> {
        for (const notification of this.repository.findAll()) {
            try {
                await this.repository.update(
                    notification.id,
                    n => domain.dismiss(n, userId)
                );
            } catch (err) {
                if (err instanceof errors.NoPermissionError) {
                    continue;
                }
                throw err;
            }
        }
    }

    async pruneStale(threshold: Date): Promise<void> {
        const stale = this.repository.findAll()
            .filter(n => n.custom && n.seenBy.length > 0 && n.addedAt < threshold)
            .map(n => n.id);
        await this.repository.delete(stale);
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
