import moment from 'moment-timezone';

const SETTINGS_KEY = 'notifications';
const INTERNAL_CONTEXT = {context: {internal: true}} as const;

export interface StoredNotification {
    id: string;
    addedAt?: string | Date;
    [key: string]: unknown;
}

interface SettingsCache {
    get(key: string): unknown;
}

interface SettingsBREADService {
    edit(
        values: Array<{key: string; value: unknown}>,
        options: typeof INTERNAL_CONTEXT
    ): Promise<unknown>;
}

interface SettingsModel {
    edit(
        values: Array<{key: string; value: string}>,
        options: typeof INTERNAL_CONTEXT
    ): Promise<unknown>;
}

export interface NotificationRepositoryDeps {
    settingsCache: SettingsCache;
    // Resolved lazily so the repository can be constructed before the settings
    // service has finished initialising.
    getSettingsBREADService: () => SettingsBREADService;
    settingsModel: SettingsModel;
}

/**
 * Stores notifications in the `notifications` setting as a JSON array. Callers
 * work with individual notifications; the array representation never leaves
 * this class.
 */
export class NotificationRepository {
    private readonly settingsCache: SettingsCache;
    private readonly getSettingsBREADService: () => SettingsBREADService;
    private readonly settingsModel: SettingsModel;

    constructor(deps: NotificationRepositoryDeps) {
        this.settingsCache = deps.settingsCache;
        this.getSettingsBREADService = deps.getSettingsBREADService;
        this.settingsModel = deps.settingsModel;
    }

    getAll(): StoredNotification[] {
        const raw = this.settingsCache.get(SETTINGS_KEY);
        if (!Array.isArray(raw)) {
            // The stored value is corrupt; wipe it so the next read is clean.
            void this.deleteAll();
            return [];
        }
        return raw.map(notification => ({
            ...notification,
            addedAt: moment(notification.addedAt).toDate()
        }));
    }

    getById(id: string): StoredNotification | null {
        return this.getAll().find(notification => notification.id === id) ?? null;
    }

    async add(notification: StoredNotification): Promise<void> {
        await this.persist([...this.getAll(), notification]);
    }

    async edit(notification: StoredNotification): Promise<void> {
        const next = this.getAll().map(
            existing => (existing.id === notification.id ? notification : existing)
        );
        await this.persist(next);
    }

    async deleteById(id: string): Promise<void> {
        await this.persist(this.getAll().filter(notification => notification.id !== id));
    }

    async deleteAll(): Promise<void> {
        await this.settingsModel.edit(
            [{key: SETTINGS_KEY, value: '[]'}],
            INTERNAL_CONTEXT
        );
    }

    private async persist(notifications: StoredNotification[]): Promise<void> {
        await this.getSettingsBREADService().edit(
            [{key: SETTINGS_KEY, value: notifications}],
            INTERNAL_CONTEXT
        );
    }
}
