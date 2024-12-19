import {Config} from '@tryghost/admin-x-framework/api/config';
import {Setting, checkStripeEnabled, getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {SiteData} from '@tryghost/admin-x-framework/api/site';
import {Tier} from '@tryghost/admin-x-framework/api/tiers';

export type portalPreviewUrlTypes = {
    settings: Setting[];
    config: Config;
    tiers: Tier[];
    siteData: SiteData | null;
    selectedTab: string;
};

export const getPortalPreviewUrl = ({settings, config, tiers, siteData, selectedTab} : portalPreviewUrlTypes): string | null => {
    if (!siteData?.url) {
        return null;
    }
    let portalTiers = tiers.filter((t) => {
        return t.visibility === 'public' && t.type === 'paid';
    }).map(t => t.id);

    const baseUrl = siteData.url.replace(/\/$/, '');
    const portalBase = '/?v=modal-portal-settings#/portal/preview';

    const portalPlans: string[] = JSON.parse(getSettingValue<string>(settings, 'portal_plans') || '');

    const settingsParam = new URLSearchParams();
    settingsParam.append('button', getSettingValue(settings, 'portal_button') ? 'true' : 'false');
    settingsParam.append('name', getSettingValue(settings, 'portal_name') ? 'true' : 'false');
    settingsParam.append('isFree', portalPlans.includes('free') ? 'true' : 'false');
    settingsParam.append('isMonthly', checkStripeEnabled(settings, config) && portalPlans.includes('monthly') ? 'true' : 'false');
    settingsParam.append('isYearly', checkStripeEnabled(settings, config) && portalPlans.includes('yearly') ? 'true' : 'false');
    settingsParam.append('page', selectedTab === 'account' ? 'accountHome' : 'signup');
    settingsParam.append('buttonIcon', encodeURIComponent(getSettingValue(settings, 'portal_button_icon') || 'icon-1'));
    settingsParam.append('signupButtonText', encodeURIComponent(getSettingValue(settings, 'portal_button_signup_text') || ''));
    settingsParam.append('membersSignupAccess', getSettingValue(settings, 'members_signup_access') || 'all');
    settingsParam.append('allowSelfSignup', getSettingValue<string>(settings, 'allow_self_signup') || 'false');
    settingsParam.append('signupTermsHtml', getSettingValue(settings, 'portal_signup_terms_html') || '');
    settingsParam.append('signupCheckboxRequired', getSettingValue(settings, 'portal_signup_checkbox_required') ? 'true' : 'false');
    settingsParam.append('portalProducts', portalTiers.join(',')); // assuming that it might be more than 1

    const portalDefaultPlan = getSettingValue<string>(settings, 'portal_default_plan');
    if (portalDefaultPlan) {
        settingsParam.append('portalDefaultPlan', portalDefaultPlan);
    }

    if (portalPlans && portalPlans.length) {
        settingsParam.append('portalPrices', encodeURIComponent(portalPlans.join(',')));
    }

    const accentColor = getSettingValue(settings, 'accent_color');
    if (accentColor !== undefined && accentColor !== null) {
        settingsParam.append('accentColor', encodeURIComponent(accentColor));
    }

    const portalButtonStyle = getSettingValue(settings, 'portal_button_style');
    if (portalButtonStyle) {
        settingsParam.append('buttonStyle', encodeURIComponent(portalButtonStyle));
    }

    settingsParam.append('disableBackground', 'false');

    return `${baseUrl}${portalBase}?${settingsParam.toString()}`;
};
