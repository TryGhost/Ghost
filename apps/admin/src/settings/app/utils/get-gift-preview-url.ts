import {type Config} from '@tryghost/admin-x-framework/api/config';
import {type Setting, checkStripeEnabled, getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {type SiteData} from '@tryghost/admin-x-framework/api/site';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';

export interface GiftPreviewUrlOptions {
    settings: Setting[];
    tiers?: Tier[];
    config: Config;
    siteData: SiteData | null;
}

export const getGiftPreviewUrl = ({settings, tiers, config, siteData}: GiftPreviewUrlOptions): string | null => {
    if (!siteData?.url) {
        return null;
    }

    const portalPlans = JSON.parse(getSettingValue<string>(settings, 'portal_plans') || '[]') as string[];
    const portalTiers = (tiers || [])
        .filter(tier => tier.active && tier.visibility === 'public' && tier.type === 'paid')
        .map(tier => tier.id);
    const stripeEnabled = checkStripeEnabled(settings, config);
    const params = new URLSearchParams();

    params.append('page', 'gift');
    params.append('isMonthly', stripeEnabled && portalPlans.includes('monthly') ? 'true' : 'false');
    params.append('isYearly', stripeEnabled && portalPlans.includes('yearly') ? 'true' : 'false');
    params.append('portalProducts', portalTiers.join(','));

    const accentColor = getSettingValue(settings, 'accent_color');
    if (accentColor !== null) {
        params.append('accentColor', encodeURIComponent(accentColor));
    }

    params.append('giftPageHeading', encodeURIComponent(getSettingValue(settings, 'gift_page_heading') || ''));
    params.append('giftPageDescription', encodeURIComponent(getSettingValue(settings, 'gift_page_description') || ''));
    params.append('giftPageImage', encodeURIComponent(getSettingValue(settings, 'gift_page_image') || ''));
    params.append('disableBackground', 'false');
    params.append('admin_toolbar', '0');

    const baseUrl = siteData.url.replace(/\/$/, '');
    return `${baseUrl}/?v=modal-portal-settings#/portal/preview?${params.toString()}`;
};
