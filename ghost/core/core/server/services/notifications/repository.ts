import {Notification} from './notification';

export interface SettingsCacheLike {
    get(key: string): unknown;
}

export interface SettingsModelLike {
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

    findById(id: string): Notification | null {
        return this.findAll().find(n => n.id === id) ?? null;
    }

    async save(notification: Notification): Promise<void> {
        const all = this.findAll();
        if (all.some(n => n.id === notification.id)) {
            return;
        }
        all.push(notification);
        await this.persist(all);
    }

    async replaceAll(notifications: Notification[]): Promise<void> {
        await this.persist(notifications);
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
