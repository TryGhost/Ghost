import {describe, expect, it} from 'vitest';

import {isPreviewMode, parsePreviewParams} from './preview';

/** Build a hash the way admin's get-portal-preview-url.ts does. */
function adminHash(params: Record<string, string>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) qs.append(key, value);
    return `#/portal/preview?${qs.toString()}`;
}

describe('isPreviewMode', () => {
    it('matches the exact preview path', () => {
        expect(isPreviewMode('#/portal/preview')).toBe(true);
        expect(isPreviewMode('#/portal/preview?button=true')).toBe(true);
    });

    it('rejects other hashes including the offer variant', () => {
        expect(isPreviewMode('#/portal/preview/offer')).toBe(false);
        expect(isPreviewMode('#/portal/signup')).toBe(false);
        expect(isPreviewMode('')).toBe(false);
    });
});

describe('parsePreviewParams', () => {
    it('maps the full admin param set onto site overrides', () => {
        const {site, page} = parsePreviewParams(adminHash({
            button: 'true',
            name: 'false',
            isFree: 'true',
            isMonthly: 'true',
            isYearly: 'false',
            page: 'accountHome',
            buttonIcon: encodeURIComponent('icon-2'),
            signupButtonText: encodeURIComponent('Join us'),
            membersSignupAccess: 'paid',
            allowSelfSignup: 'false',
            signupTermsHtml: 'I agree to <a href="/terms">terms</a>',
            signupCheckboxRequired: 'true',
            portalProducts: 'tier-1,tier-2',
            portalDefaultPlan: 'yearly',
            accentColor: encodeURIComponent('#FF1A75'),
            buttonStyle: encodeURIComponent('icon-and-text'),
            disableBackground: 'false',
            admin_toolbar: '0'
        }));

        expect(page).toBe('accountHome');
        expect(site.portal_button).toBe(true);
        expect(site.portal_name).toBe(false);
        expect(site.portal_plans).toEqual(['free', 'monthly']);
        expect(site.portal_products).toEqual(['tier-1', 'tier-2']);
        expect(site.portal_button_icon).toBe('icon-2');
        expect(site.portal_button_signup_text).toBe('Join us');
        expect(site.members_signup_access).toBe('paid');
        expect(site.portal_signup_terms_html).toBe('I agree to <a href="/terms">terms</a>');
        expect(site.portal_signup_checkbox_required).toBe(true);
        expect(site.portal_default_plan).toBe('yearly');
        expect(site.accent_color).toBe('#FF1A75');
        expect(site.portal_button_style).toBe('icon-and-text');
        expect('allow_self_signup' in site).toBe(false);
    });

    it('lets portalPrices override the plan flags, including when empty', () => {
        const overridden = parsePreviewParams(adminHash({isFree: 'true', isMonthly: 'true', portalPrices: encodeURIComponent('yearly')}));
        expect(overridden.site.portal_plans).toEqual(['yearly']);

        const empty = parsePreviewParams(adminHash({isFree: 'true', portalPrices: ''}));
        expect(empty.site.portal_plans).toEqual([]);
    });

    it('treats absent portalProducts as no filter and empty as an empty filter', () => {
        expect(parsePreviewParams('#/portal/preview?button=true').site.portal_products).toBeNull();
        expect(parsePreviewParams(adminHash({portalProducts: ''})).site.portal_products).toEqual([]);
    });

    it('flattens transistor settings JSON', () => {
        const {site} = parsePreviewParams(adminHash({
            transistorPortalSettings: JSON.stringify({
                enabled: true,
                heading: 'My Podcast',
                description: 'Feeds',
                button_text: 'Listen',
                url_template: 'https://example.com/{memberUuid}'
            })
        }));

        expect(site.transistor_portal_enabled).toBe(true);
        expect(site.transistor_portal_heading).toBe('My Podcast');
        expect(site.transistor_portal_description).toBe('Feeds');
        expect(site.transistor_portal_button_text).toBe('Listen');
        expect(site.transistor_portal_url_template).toBe('https://example.com/{memberUuid}');
    });

    it('survives malformed values without throwing', () => {
        const {site} = parsePreviewParams(adminHash({
            button: 'notjson',
            transistorPortalSettings: '{broken',
            signupTermsHtml: 'Get 50% off today',
            membersSignupAccess: 'sometimes'
        }));

        expect(site.portal_button).toBeUndefined();
        expect(site.transistor_portal_enabled).toBeUndefined();
        expect(site.portal_signup_terms_html).toBe('Get 50% off today');
        expect(site.members_signup_access).toBeUndefined();
    });

    it('defaults to the signup page', () => {
        expect(parsePreviewParams('#/portal/preview?button=true').page).toBe('signup');
        expect(parsePreviewParams(adminHash({page: 'signup'})).page).toBe('signup');
    });
});
