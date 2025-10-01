import {GhostAdminApiAdapter} from './ghost-api';
import {HttpClient} from './api';

/**
 * Ghost Settings API adapter
 *
 * The Settings API differs from other Ghost Admin API endpoints:
 * - GET /ghost/api/admin/settings/ returns {settings: [...]} (all settings at once)
 * - PUT /ghost/api/admin/settings/ expects {settings: [...]} and returns ALL settings
 * - No "create" operation (settings are predefined)
 * - No ID-based operations (no /settings/123)
 * - Request data is already in {settings: [...]} format (no additional wrapping needed)
 *
 * We extend GhostAdminApiAdapter but override transform functions and ID-based methods.
 */
export class GhostSettingsApiAdapter extends GhostAdminApiAdapter {
    constructor(httpClient: HttpClient, queryParams?: Record<string, string>) {
        // Call parent with 'settings' as the resource path
        super(httpClient, 'settings', queryParams);

        // Override transform functions to be pass-through
        // Settings data arrives already formatted as {settings: [...]}, so we don't need
        // the array wrapping/unwrapping that GhostAdminApiAdapter does
        this.transformRequest = (data: unknown) => data;
        this.transformResponse = (response: unknown) => response;
    }

    /**
     * Override insert to throw error since settings cannot be created
     */
    async insert<T>(): Promise<T> {
        throw new Error('Settings cannot be created. Use update() to modify existing settings.');
    }

    /**
     * Override findById to fetch all settings (ignoring ID parameter)
     * The Settings API doesn't support fetching individual settings by ID
     */
    async findById<T>(entityType: string): Promise<T> {
        const response = await this.httpClient.get(this.buildUrl());

        if (!response.ok()) {
            throw new Error(`Failed to fetch ${entityType}: ${response.status()}`);
        }

        return await response.json() as T;
    }

    /**
     * Override update to handle settings-specific PUT behavior
     * Settings API doesn't use IDs and doesn't require fetching existing data first
     */
    async update<T>(entityType: string, _id: string, data: Partial<T>): Promise<T> {
        // Settings API doesn't need to fetch existing data first (unlike the parent implementation)
        const response = await this.httpClient.put(this.buildUrl(), {
            data
        });

        if (!response.ok()) {
            const errorBody = await response.json().catch(() => null);
            const errorMessage = errorBody ? JSON.stringify(errorBody) : '';
            throw new Error(`Failed to update ${entityType}: ${response.status()} ${errorMessage}`);
        }

        return await response.json() as T;
    }

    /**
     * Override delete since settings cannot be deleted
     */
    async delete(): Promise<void> {
        throw new Error('Settings cannot be deleted.');
    }
}
