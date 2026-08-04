import * as assert from 'assert/strict';
import {type Config} from '@tryghost/admin-x-framework/api/config';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {type SiteData} from '@tryghost/admin-x-framework/api/site';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';
import {getGiftPreviewUrl} from './get-gift-preview-url';

const settings = (values: Record<string, unknown>): Setting[] => (
    Object.entries(values).map(([key, value]) => ({key, value})) as Setting[]
);

const tier = (overrides: Partial<Tier> = {}): Tier => ({
    id: 'tier-1',
    name: 'Premium',
    description: null,
    slug: 'premium',
    active: true,
    type: 'paid',
    welcome_page_url: null,
    created_at: '',
    updated_at: '',
    visibility: 'public',
    benefits: [],
    trial_days: 0,
    monthly_price: 500,
    yearly_price: 5000,
    ...overrides
});

const stripeSettings = {
    stripe_connect_publishable_key: 'pk_test',
    stripe_connect_secret_key: 'sk_test',
    portal_plans: '["monthly","yearly"]'
};
const config = {stripeDirect: false} as Config;
const siteData = {url: 'https://example.com/'} as SiteData;
const paramsOf = (url: string | null) => new URLSearchParams(url!.split('?').at(-1));
const decodedParam = (params: URLSearchParams, key: string) => decodeURIComponent(params.get(key) || '');

describe('getGiftPreviewUrl', function () {
    it('returns null without a site URL', function () {
        assert.equal(getGiftPreviewUrl({settings: settings({}), config, siteData: null}), null);
    });

    it('passes unsaved gift content and Portal offer settings to the real Portal preview', function () {
        const url = getGiftPreviewUrl({
            settings: settings({
                ...stripeSettings,
                gift_page_heading: 'Local heading',
                gift_page_description: 'Local description',
                gift_page_image: 'https://example.com/image.jpg'
            }),
            tiers: [tier(), tier({id: 'hidden', visibility: 'none'})],
            config,
            siteData
        });
        const params = paramsOf(url);

        assert.equal(params.get('page'), 'gift');
        assert.equal(params.get('isMonthly'), 'true');
        assert.equal(params.get('isYearly'), 'true');
        assert.equal(params.get('portalProducts'), 'tier-1');
        assert.equal(decodedParam(params, 'giftPageHeading'), 'Local heading');
        assert.equal(decodedParam(params, 'giftPageDescription'), 'Local description');
        assert.equal(decodedParam(params, 'giftPageImage'), 'https://example.com/image.jpg');
    });

    it('passes an unavailable offer when Stripe, paid plans, or public tiers are absent', function () {
        const url = getGiftPreviewUrl({
            settings: settings({portal_plans: '[]'}),
            tiers: [tier({visibility: 'none'})],
            config,
            siteData
        });
        const params = paramsOf(url);

        assert.equal(params.get('isMonthly'), 'false');
        assert.equal(params.get('isYearly'), 'false');
        assert.equal(params.get('portalProducts'), '');
    });
});
