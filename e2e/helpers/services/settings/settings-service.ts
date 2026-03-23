import {HttpClient as APIRequest} from '@/data-factory';

export interface Setting {
    key: string;
    value: string | number | boolean | string[] | null;
}

export interface SettingsResponse {
    settings: Setting[];
}

export type CommentsEnabled = 'all' | 'paid' | 'off';
export type MembersSignupAccess = 'all' | 'invite' | 'paid' | 'none';
export type PortalPlan = 'free' | 'monthly' | 'yearly';

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

    async updateSettings(settings: Setting[]) {
        const data = {settings};
        const response = await this.request.put(`${this.adminEndpoint}/settings`, {data});

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
        return await this.updateSettings(updatedSettings);
    }

    /**
     * Set comments enabled setting
     * @param value - 'all' (all members), 'paid' (paid members only), or 'off' (disabled)
     */
    async setCommentsEnabled(value: CommentsEnabled) {
        return await this.updateSettings([{key: 'comments_enabled', value}]);
    }

    async setMembersSignupAccess(value: MembersSignupAccess) {
        return await this.updateSettings([{key: 'members_signup_access', value}]);
    }

    async setPortalPlans(value: PortalPlan[]) {
        return await this.updateSettings([{key: 'portal_plans', value}]);
    }

    async setDonationsSuggestedAmount(value: number) {
        return await this.updateSettings([{key: 'donations_suggested_amount', value: value.toString()}]);
    }

    async setDonationsCurrency(value: string) {
        return await this.updateSettings([{key: 'donations_currency', value}]);
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
        return await this.updateSettings([
            {key: 'stripe_secret_key', value: secretKey},
            {key: 'stripe_publishable_key', value: publishableKey}
        ]);
    }

    async setStripeDisconnected() {
        return await this.updateSettings([
            {key: 'stripe_secret_key', value: null},
            {key: 'stripe_publishable_key', value: null},
            {key: 'stripe_billing_portal_configuration_id', value: null}
        ]);
    }

    /**
     * Set transistor integration enabled/disabled
     */
    async setTransistorEnabled(enabled: boolean) {
        const data = {settings: [{key: 'transistor', value: enabled}]};
        const response = await this.request.put(`${this.adminEndpoint}/settings`, {data});
        return await response.json() as SettingsResponse;
    }

    /**
     * Set member source tracking enabled/disabled
     * @param enabled - true to enable member source tracking, false to disable
     */
    async setMembersTrackSources(enabled: boolean) {
        return await this.updateSettings([{key: 'members_track_sources', value: enabled}]);
    }
}
