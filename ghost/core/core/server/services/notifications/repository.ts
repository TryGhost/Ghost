import moment from 'moment-timezone';

const SETTINGS_KEY = 'notifications';
const INTERNAL_CONTEXT = {context: {internal: true}} as const;

export interface StoredNotification {
    id: string;
    type?: string;
    status?: string;
    message?: string;
    custom?: boolean;
    dismissible?: boolean;
    top?: boolean;
    location?: string;
    seen?: boolean;
    seenBy?: string[];
    createdAt?: string | Date;
    createdAtVersion?: string;
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
 * Stores notifications in the `notifications` setting as a JSON array. Writes
 * the whole collection at once; callers read it, build the desired final state
 * in memory, and replace. Per-item write methods are deliberately absent so
 * callers cannot accidentally loop one-at-a-time, which on this storage shape
 * (one settings row holding all notifications) is N writes of an N-sized blob.
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

    async replaceAll(notifications: StoredNotification[]): Promise<void> {
        await this.getSettingsBREADService().edit(
            [{key: SETTINGS_KEY, value: notifications}],
            INTERNAL_CONTEXT
        );
    }

    async deleteAll(): Promise<void> {
        await this.settingsModel.edit(
            [{key: SETTINGS_KEY, value: '[]'}],
            INTERNAL_CONTEXT
        );
    }
}
