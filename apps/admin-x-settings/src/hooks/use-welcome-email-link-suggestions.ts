import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../components/providers/global-data-provider';
import {useKoenigLinkSuggestions} from '@tryghost/admin-x-framework';

export const useWelcomeEmailLinkSuggestions = () => {
    const {settings, siteData} = useGlobalData();
    const membersSignupAccess = getSettingValue<string>(settings, 'members_signup_access') ?? 'none';
    const donationsEnabled = getSettingValue<boolean>(settings, 'donations_enabled') ?? false;
    const recommendationsEnabled = getSettingValue<boolean>(settings, 'recommendations_enabled') ?? false;

    return useKoenigLinkSuggestions({
        siteUrl: siteData.url,
        membersSignupAccess,
        donationsEnabled,
        recommendationsEnabled
    });
};
