import {Factory} from './factory';
import type {PersistenceAdapter} from '../persistence/adapter';

export type SettingValue = string | boolean | null;

export interface Setting {
    key: string;
    value: SettingValue;
}

export interface SettingsResponse {
    settings: Setting[];
}

/**
 * SettingsFactory for interacting with the Ghost Settings API
 *
 * Unlike other factories, settings cannot be "created" - they are predefined
 * in Ghost. This factory focuses on fetching and updating existing settings.
 *
 * Key use cases:
 * - Toggle labs flags for feature testing
 * - Update site settings programmatically
 * - Fetch current settings state
 */
export class SettingsFactory extends Factory<Partial<Setting>, SettingsResponse> {
    name = 'settings';
    entityType = 'settings';

    constructor(adapter?: PersistenceAdapter) {
        super(adapter);
    }

    /**
     * Build is not applicable for settings since they're predefined
     * This method exists to satisfy the Factory interface
     */
    build(options?: Partial<Setting>): SettingsResponse {
        if (!options?.key || options.value === undefined) {
            throw new Error('Settings factory build() requires both key and value');
        }
        return {
            settings: [{
                key: options.key,
                value: options.value
            }]
        };
    }

    /**
     * Fetch all current settings from the Ghost API
     */
    async fetch(): Promise<SettingsResponse> {
        if (!this.adapter) {
            throw new Error('Cannot fetch settings without a persistence adapter');
        }
        // Use empty string as ID since settings endpoint doesn't use IDs
        return await this.adapter.findById<SettingsResponse>(this.entityType, '');
    }

    /**
     * Update one or more settings
     * @param settings - Array of settings to update (key/value pairs)
     * @returns All settings (Ghost API returns all settings on update)
     */
    async update(settings: Setting[]): Promise<SettingsResponse> {
        if (!this.adapter) {
            throw new Error('Cannot update settings without a persistence adapter');
        }
        // Settings API uses PUT without an ID, pass empty string
        return await this.adapter.update<SettingsResponse>(
            this.entityType,
            '',
            {settings} as Partial<SettingsResponse>
        );
    }

    /**
     * Update labs flags (feature flags)
     * @param flags - Object with flag names as keys and boolean values
     * @returns All settings after update
     *
     * @example
     * await settingsFactory.updateLabs({importMemberTier: true, lexicalEditor: false})
     */
    async updateLabs(flags: Record<string, boolean>): Promise<SettingsResponse> {
        // First fetch current settings to get existing labs value
        const currentSettings = await this.fetch();
        const labsSetting = currentSettings.settings.find(s => s.key === 'labs');

        // Parse existing labs, merge with new flags, stringify back
        const currentLabs = labsSetting?.value
            ? JSON.parse(labsSetting.value as string)
            : {};
        const updatedLabs = {...currentLabs, ...flags};

        return await this.update([{
            key: 'labs',
            value: JSON.stringify(updatedLabs)
        }]);
    }

    /**
     * Get a specific setting value by key
     * @param key - The setting key to retrieve
     * @returns The setting value or null if not found
     */
    async getSetting(key: string): Promise<SettingValue | null> {
        const response = await this.fetch();
        const setting = response.settings.find(s => s.key === key);
        return setting ? setting.value : null;
    }

    /**
     * Get current labs flags
     * @returns Object with all labs flags and their current state
     */
    async getLabs(): Promise<Record<string, boolean>> {
        const labsValue = await this.getSetting('labs');
        return labsValue ? JSON.parse(labsValue as string) : {};
    }
}
