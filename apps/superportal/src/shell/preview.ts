import type {SiteState} from '../types';

export type PreviewPage = 'signup' | 'accountHome';

/** Ghost Admin's portal-settings preview hash. Ports check-mode.js#isNormalPreviewMode. */
export function isPreviewMode(hash: string = window.location.hash): boolean {
    return hash.substring(1).split('?')[0] === '/portal/preview';
}

function safeDecode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function safeJsonParse<T>(value: string): T | undefined {
    try {
        return JSON.parse(value) as T;
    } catch {
        return undefined;
    }
}

interface TransistorPreviewSettings {
    enabled?: boolean;
    heading?: string;
    description?: string;
    button_text?: string;
    url_template?: string;
}

/**
 * Map the admin preview URL's hash query params onto site-state overrides.
 * Ports apps/portal/src/app.js#fetchQueryStrData, including its quirks:
 * `portalPrices` overrides the isFree/isMonthly/isYearly flags even when
 * empty, and absent `portalProducts` means "no tier filter" (null).
 *
 * Admin pre-encodes some values (accentColor, buttonIcon, ...) on top of
 * URLSearchParams' own encoding, so every value gets a second decode —
 * same as portal, but guarded so a stray `%` can't throw.
 */
export function parsePreviewParams(hash: string): {site: Partial<SiteState>; page: PreviewPage} {
    const qs = hash.split('?')[1] ?? '';
    const site: Partial<SiteState> = {};
    let page: PreviewPage = 'signup';
    const allowedPlans: string[] = [];
    let portalPrices: string[] | undefined;
    let portalProducts: string[] | null = null;

    for (const [key, raw] of new URLSearchParams(qs).entries()) {
        const value = safeDecode(raw);
        if (key === 'button') {
            const v = safeJsonParse<boolean>(value);
            if (typeof v === 'boolean') site.portal_button = v;
        } else if (key === 'name') {
            const v = safeJsonParse<boolean>(value);
            if (typeof v === 'boolean') site.portal_name = v;
        } else if (key === 'isFree' && safeJsonParse<boolean>(value)) {
            allowedPlans.push('free');
        } else if (key === 'isMonthly' && safeJsonParse<boolean>(value)) {
            allowedPlans.push('monthly');
        } else if (key === 'isYearly' && safeJsonParse<boolean>(value)) {
            allowedPlans.push('yearly');
        } else if (key === 'portalPrices') {
            portalPrices = value ? value.split(',') : [];
        } else if (key === 'portalProducts') {
            portalProducts = value ? value.split(',') : [];
        } else if (key === 'page' && value === 'accountHome') {
            page = 'accountHome';
        } else if (key === 'accentColor') {
            site.accent_color = value;
        } else if (key === 'buttonIcon' && value) {
            site.portal_button_icon = value;
        } else if (key === 'signupButtonText') {
            site.portal_button_signup_text = value || '';
        } else if (key === 'signupTermsHtml') {
            site.portal_signup_terms_html = value || '';
        } else if (key === 'signupCheckboxRequired') {
            const v = safeJsonParse<boolean>(value);
            if (typeof v === 'boolean') site.portal_signup_checkbox_required = v;
        } else if (key === 'buttonStyle' && value) {
            site.portal_button_style = value;
        } else if (key === 'membersSignupAccess' && (value === 'all' || value === 'invite' || value === 'none' || value === 'paid')) {
            site.members_signup_access = value;
        } else if (key === 'portalDefaultPlan' && value) {
            site.portal_default_plan = value;
        } else if (key === 'transistorPortalSettings' && value) {
            const v = safeJsonParse<TransistorPreviewSettings>(value);
            if (v && typeof v === 'object') {
                site.transistor_portal_enabled = v.enabled === true;
                if (typeof v.heading === 'string') site.transistor_portal_heading = v.heading;
                if (typeof v.description === 'string') site.transistor_portal_description = v.description;
                if (typeof v.button_text === 'string') site.transistor_portal_button_text = v.button_text;
                if (typeof v.url_template === 'string') site.transistor_portal_url_template = v.url_template;
            }
        }
        // Ignored on purpose: allowSelfSignup (admin sends it, portal never
        // parsed it), disableBackground (always 'false'), admin_toolbar, and
        // the legacy monthlyPrice/yearlyPrice/currency params admin never sends.
    }

    site.portal_plans = portalPrices ?? allowedPlans;
    site.portal_products = portalProducts;
    return {site, page};
}
