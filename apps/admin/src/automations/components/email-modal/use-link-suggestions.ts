import {getSettingValues, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useKoenigLinkSuggestions} from '@tryghost/admin-x-framework';

// Provides Koenig link autocomplete config for the email editor. Reads settings
// and site directly from framework hooks (no global data provider required) and
// falls back to safe defaults while those requests are still loading.
export const useEmailLinkSuggestions = () => {
    const {data: settingsData} = useBrowseSettings();
    const {data: siteData} = useBrowseSite();
    const settings = settingsData?.settings || [];
    const siteUrl = siteData?.site?.url || '';
    const [
        membersSignupAccess = 'all',
        donationsEnabled = false,
        recommendationsEnabled = false
    ] = getSettingValues(settings, [
        'members_signup_access',
        'donations_enabled',
        'recommendations_enabled'
    ]);

    return useKoenigLinkSuggestions({
        siteUrl,
        membersSignupAccess: typeof membersSignupAccess === 'string' ? membersSignupAccess : 'all',
        donationsEnabled: Boolean(donationsEnabled),
        recommendationsEnabled: Boolean(recommendationsEnabled)
    });
};
