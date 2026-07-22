import {type Config} from '@tryghost/admin-x-framework/api/config';
import {type Setting, checkStripeEnabled, getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {type SiteData} from '@tryghost/admin-x-framework/api/site';

export type giftPreviewUrlTypes = {
    settings: Setting[];
    config: Config;
    siteData: SiteData | null;
};

// Builds a Portal preview URL that renders the gift page (`page=gift`) with the
// draft gift settings applied on top of the real site data — so heading,
// description, image and offered durations update live as they're edited. Real
// tiers/prices carry through from the members site API (see app.jsx fetchData),
// so only the gift-specific customization needs to be passed here.
export const getGiftPreviewUrl = ({settings, config, siteData}: giftPreviewUrlTypes): string | null => {
    if (!siteData?.url) {
        return null;
    }

    const baseUrl = siteData.url.replace(/\/$/, '');
    const portalBase = '/?v=modal-portal-settings#/portal/preview';

    const portalPlans: string[] = JSON.parse(getSettingValue<string>(settings, 'portal_plans') || '[]');

    const params = new URLSearchParams();
    params.append('page', 'gift');
    // Duration anchors (monthly/yearly) are only offered when their plan is
    // enabled in Portal, so pass the plan flags through for the preview.
    params.append('isMonthly', checkStripeEnabled(settings, config) && portalPlans.includes('monthly') ? 'true' : 'false');
    params.append('isYearly', checkStripeEnabled(settings, config) && portalPlans.includes('yearly') ? 'true' : 'false');

    const accentColor = getSettingValue(settings, 'accent_color');
    if (accentColor !== undefined && accentColor !== null) {
        params.append('accentColor', encodeURIComponent(accentColor));
    }

    params.append('giftPageHeading', encodeURIComponent(getSettingValue(settings, 'gift_page_heading') || ''));
    params.append('giftPageDescription', encodeURIComponent(getSettingValue(settings, 'gift_page_description') || ''));
    params.append('giftPageImage', encodeURIComponent(getSettingValue(settings, 'gift_page_image') || ''));
    params.append('giftDurations', encodeURIComponent(getSettingValue(settings, 'gift_durations') || '[1,12]'));
    params.append('giftTiers', encodeURIComponent(getSettingValue(settings, 'gift_tiers') || '[]'));

    params.append('disableBackground', 'false');
    params.append('admin_toolbar', '0');

    return `${baseUrl}${portalBase}?${params.toString()}`;
};
