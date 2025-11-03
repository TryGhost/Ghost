import {HttpClient as APIRequest} from '../../../data-factory/persistence/adapters/http-client';

export interface Setting {
    key: string;
    value: string | boolean | null;
}

export interface SettingsResponse {
    settings: Setting[];
}

export class SettingsService {
    private readonly request: APIRequest;
    private readonly adminEndpoint: string;

    constructor(request: APIRequest) {
        this.request = request;
        this.adminEndpoint = '/ghost/api/admin';
    }

    async getSettings() {
        const response = await this.request.get(`${this.adminEndpoint}/settings`);
        return await response.json() as SettingsResponse;
    }

    async updateLabsSettings(flags: Record<string, boolean>) {
        const currentSettings = await this.getSettings();
        const labsSetting = currentSettings.settings.find(s => s.key === 'labs');

        // Parse existing labs, merge with new flags, stringify back
        const currentLabs = labsSetting?.value ? JSON.parse(labsSetting.value as string) : {};
        const updatedLabs = {...currentLabs, ...flags};
        const updatedSettings = [{key: 'labs', value: JSON.stringify(updatedLabs)}];

        // Settings API expects the data directly without the extra 'data' wrapper
        const data = {settings: updatedSettings};
        const response = await this.request.put(`${this.adminEndpoint}/settings`, {data});

        return await response.json() as SettingsResponse;
    }
}
