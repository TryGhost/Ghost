import {type Config} from '@tryghost/admin-x-framework/api/config';
import {type Setting, checkStripeEnabled, getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {type SiteData} from '@tryghost/admin-x-framework/api/site';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';

export type giftPreviewUrlTypes = {
    settings: Setting[];
    tiers?: Tier[];
    config: Config;
    siteData: SiteData | null;
};

// Builds a Portal preview URL that renders the gift page (`page=gift`) with the
// draft gift settings applied on top of the real site data — so heading,
// description, image and offered durations update live as they're edited. Tiers
// carry through from the members site API (see app.jsx fetchData), but unsaved
// per-duration gift-price overrides are passed as `giftPrices` so the preview
// reflects price edits live too.
export const getGiftPreviewUrl = ({settings, tiers, config, siteData}: giftPreviewUrlTypes): string | null => {
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

    // Pass unsaved per-duration price overrides ({ tierId: { months: cents } })
    // for any tier that has them, so edits show in the preview before saving.
    if (tiers?.length) {
        const giftPrices = tiers.reduce<Record<string, Record<string, number | null>>>((acc, tier) => {
            if (tier.gift_prices && Object.keys(tier.gift_prices).length > 0) {
                acc[tier.id] = tier.gift_prices;
            }
            return acc;
        }, {});
        if (Object.keys(giftPrices).length > 0) {
            params.append('giftPrices', encodeURIComponent(JSON.stringify(giftPrices)));
        }
    }

    params.append('disableBackground', 'false');
    params.append('admin_toolbar', '0');

    return `${baseUrl}${portalBase}?${params.toString()}`;
};
