import logging from '@tryghost/logging';
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
                continue;
            }
            const id = typeof entry === 'object' && entry !== null
                ? (entry as Record<string, unknown>).id
                : null;
            logging.warn({
                event: {name: 'notifications.repository.validation-failed'},
                notificationId: id,
                issues: parsed.error.issues
            }, 'Dropping stored notification that fails validation');
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
        await this.persist([...all, notification]);
    }

    async update(
        id: string,
        mutator: (notification: Notification) => Notification
    ): Promise<void> {
        const all = this.findAll();
        const index = all.findIndex(n => n.id === id);
        if (index === -1) {
            return;
        }
        const next = mutator(all[index]);
        if (next === all[index]) {
            return;
        }
        const updated = [...all];
        updated[index] = next;
        await this.persist(updated);
    }

    async delete(ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }
        const drop = new Set(ids);
        const survivors = this.findAll().filter(n => !drop.has(n.id));
        await this.persist(survivors);
    }

    private async persist(notifications: Notification[]): Promise<void> {
        await this.settingsModel.edit(
            [{key: SETTINGS_KEY, value: JSON.stringify(notifications)}],
            INTERNAL_CONTEXT
        );
    }
}
