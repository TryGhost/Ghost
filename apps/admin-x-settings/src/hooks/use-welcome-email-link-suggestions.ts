import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../components/providers/global-data-provider';
import {useKoenigLinkSuggestions} from '@tryghost/admin-x-framework';

export const useWelcomeEmailLinkSuggestions = () => {
    const {settings, siteData} = useGlobalData();
    const [
        membersSignupAccess,
        donationsEnabled = false,
        recommendationsEnabled = false
    ] = getSettingValues(settings, [
        'members_signup_access',
        'donations_enabled',
        'recommendations_enabled'
    ]);

    if (typeof membersSignupAccess !== 'string') {
        throw new TypeError('members_signup_access should be a string');
    }
    if (typeof donationsEnabled !== 'boolean') {
        throw new TypeError('donations_enabled should be a boolean');
    }
    if (typeof recommendationsEnabled !== 'boolean') {
        throw new TypeError('recommendations_enabled should be a boolean');
    }

    return useKoenigLinkSuggestions({
        siteUrl: siteData.url,
        membersSignupAccess,
        donationsEnabled,
        recommendationsEnabled
    });
};
