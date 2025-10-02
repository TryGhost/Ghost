import {HttpClient} from '../../../data-factory';

export interface Setting {
    key: string;
    value: string | boolean | null;
}

export interface SettingsResponse {
    settings: Setting[];
}


export class GhostClient {
    private readonly httpClient: HttpClient;
    private readonly adminEndpoint: string;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
        this.adminEndpoint = '/ghost/api/admin';
    }

    async getSettings() {
        const response = await this.httpClient.get(`${this.adminEndpoint}/settings`);
        return await response.json() as SettingsResponse;
    }

    async updateSettings(flags: Record<string, boolean>) {
        const currentSettings = await this.getSettings();
        const labsSetting = currentSettings.settings.find(s => s.key === 'labs');

        // Parse existing labs, merge with new flags, stringify back
        const currentLabs = labsSetting?.value ? JSON.parse(labsSetting.value as string) : {};
        const updatedLabs = {...currentLabs, ...flags};
        const updatedSettings = [{key: 'labs', value: JSON.stringify(updatedLabs)}];

        const data = {data: {settings: updatedSettings}};
        await this.httpClient.put(`${this.adminEndpoint}/settings`, data);
        return await this.getSettings();
    }
}
