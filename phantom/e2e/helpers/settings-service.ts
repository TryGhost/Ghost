// Slim port of /e2e/helpers/services/settings/settings-service.ts using
// Playwright's APIRequestContext directly.
import type {APIRequestContext} from '@playwright/test';

export interface Setting {
    key: string;
    value: string | number | boolean | string[] | null;
}

export interface SettingsResponse {
    settings: Setting[];
}

export type CommentsEnabled = 'all' | 'paid' | 'off';
export type MembersSignupAccess = 'all' | 'invite' | 'paid' | 'none';

export class SettingsService {
    private readonly request: APIRequestContext;
    private readonly adminEndpoint = '/ghost/api/admin';

    constructor(request: APIRequestContext) {
        this.request = request;
    }

    async getSettings() {
        const response = await this.request.get(`${this.adminEndpoint}/settings/`);
        return await response.json() as SettingsResponse;
    }

    async updateSettings(settings: Setting[]) {
        const response = await this.request.put(`${this.adminEndpoint}/settings/`, {data: {settings}});
        return await response.json() as SettingsResponse;
    }

    async updateLabsSettings(flags: Record<string, boolean>) {
        const currentSettings = await this.getSettings();
        const labsSetting = currentSettings.settings.find(s => s.key === 'labs');

        const currentLabs = labsSetting?.value ? JSON.parse(labsSetting.value as string) : {};
        const updatedLabs = {...currentLabs, ...flags};
        return await this.updateSettings([{key: 'labs', value: JSON.stringify(updatedLabs)}]);
    }

    async setCommentsEnabled(value: CommentsEnabled) {
        return await this.updateSettings([{key: 'comments_enabled', value}]);
    }

    async setMembersSignupAccess(value: MembersSignupAccess) {
        return await this.updateSettings([{key: 'members_signup_access', value}]);
    }
}
