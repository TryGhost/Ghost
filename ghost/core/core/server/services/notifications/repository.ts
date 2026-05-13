import {Notification} from './notification';

interface SettingsCacheLike {
    get(key: string): unknown;
}

interface SettingsModelLike {
    edit(
        updates: Array<{key: string; value: string}>,
        options: {context: {internal: true}}
    ): Promise<unknown>;
}

const SETTINGS_KEY = 'notifications';
const INTERNAL_CONTEXT = {context: {internal: true}} as const;

export class NotificationRepository {
    private readonly settingsCache: SettingsCacheLike;
    private readonly settingsModel: SettingsModelLike;

    constructor(deps: {
        settingsCache: SettingsCacheLike;
        settingsModel: SettingsModelLike;
    }) {
        this.settingsCache = deps.settingsCache;
        this.settingsModel = deps.settingsModel;
    }

    findAll(): Notification[] {
        const raw = this.settingsCache.get(SETTINGS_KEY);
        if (!Array.isArray(raw)) {
            return [];
        }
        const notifications: Notification[] = [];
        for (const entry of raw) {
            const parsed = Notification.safeParse(entry);
            if (parsed.success) {
                notifications.push(parsed.data);
            }
        }
        return notifications;
    }

    async saveAll(notifications: Notification[]): Promise<Notification[]> {
        const existing = this.findAll();
        const ids = new Set(existing.map(n => n.id));
        const added: Notification[] = [];
        for (const notification of notifications) {
            if (ids.has(notification.id)) {
                continue;
            }
            ids.add(notification.id);
            added.push(notification);
        }
        if (added.length === 0) {
            return [];
        }
        await this.persist([...existing, ...added]);
        return added;
    }

    async replaceAll(notifications: Notification[]): Promise<void> {
        await this.persist(notifications);
    }

    async deleteReleaseNotifications(): Promise<void> {
        const survivors = this.findAll().filter(n => n.custom !== false);
        await this.persist(survivors);
    }

    async pruneOlderThan(threshold: Date): Promise<void> {
        const all = this.findAll();
        const kept = all.filter((n) => {
            // Release notifications are preserved regardless of age.
            if (n.custom === false) {
                return true;
            }
            if (n.seenBy.length === 0) {
                return true;
            }
            return n.addedAt >= threshold;
        });
        if (kept.length === all.length) {
            return;
        }
        await this.persist(kept);
    }

    private async persist(notifications: Notification[]): Promise<void> {
        await this.settingsModel.edit(
            [{key: SETTINGS_KEY, value: JSON.stringify(notifications)}],
            INTERNAL_CONTEXT
        );
    }
}
