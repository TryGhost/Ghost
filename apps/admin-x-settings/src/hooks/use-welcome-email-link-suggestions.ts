import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../components/providers/global-data-provider';
import {useKoenigLinkSuggestions} from '@tryghost/admin-x-framework';

export const useWelcomeEmailLinkSuggestions = () => {
    const {settings, siteData} = useGlobalData();
    const [membersSignupAccess, donationsEnabled, recommendationsEnabled] = getSettingValues(settings, [
        'members_signup_access',
        'donations_enabled',
        'recommendations_enabled'
    ]) as [string, boolean, boolean];

    return useKoenigLinkSuggestions({
        siteUrl: siteData.url,
        membersSignupAccess,
        donationsEnabled,
        recommendationsEnabled
    });
};
