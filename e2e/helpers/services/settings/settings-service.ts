import {HttpClient as APIRequest} from '@/data-factory';

export interface Setting {
    key: string;
    value: string | boolean | null;
}

export interface SettingsResponse {
    settings: Setting[];
}

export type CommentsEnabled = 'all' | 'paid' | 'off';

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

    /**
     * Set comments enabled setting
     * @param value - 'all' (all members), 'paid' (paid members only), or 'off' (disabled)
     */
    async setCommentsEnabled(value: CommentsEnabled) {
        const data = {settings: [{key: 'comments_enabled', value}]};
        const response = await this.request.put(`${this.adminEndpoint}/settings`, {data});
        return await response.json() as SettingsResponse;
    }

    /**
     * Set Stripe keys to simulate a connected Stripe account
     * Uses direct Stripe keys (not Connect) as they're not filtered by the API
     * Uses test keys by default, but can be overridden if needed
     */
    async setStripeConnected(
        secretKey: string = 'sk_test_e2eTestKey',
        publishableKey: string = 'pk_test_e2eTestKey'
    ) {
        const data = {
            settings: [
                {key: 'stripe_secret_key', value: secretKey},
                {key: 'stripe_publishable_key', value: publishableKey}
            ]
        };
        const response = await this.request.put(`${this.adminEndpoint}/settings`, {data});
        return await response.json() as SettingsResponse;
    }
}
