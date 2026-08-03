import * as assert from 'assert/strict';
import {type Config} from '@tryghost/admin-x-framework/api/config';
import {type Setting} from '@tryghost/admin-x-framework/api/settings';
import {type SiteData} from '@tryghost/admin-x-framework/api/site';
import {type Tier} from '@tryghost/admin-x-framework/api/tiers';
import {getGiftPreviewUrl} from '../../../src/utils/get-gift-preview-url';

const settings = (values: Record<string, unknown>): Setting[] =>
    Object.entries(values).map(([key, value]) => ({key, value})) as Setting[];

const tier = (id: string, visibility: string, type = 'paid'): Tier =>
    ({id, visibility, type} as Tier);

// Stripe is read via checkStripeEnabled, which is satisfied by the connect keys.
const stripeSettings = {
    stripe_connect_publishable_key: 'pk_test',
    stripe_connect_secret_key: 'sk_test',
    portal_plans: '["monthly","yearly"]'
};

const config = {} as Config;
const siteData = {url: 'https://example.com/'} as SiteData;

const paramsOf = (url: string | null) => new URLSearchParams(url!.split('?').slice(-1)[0]);

describe('getGiftPreviewUrl', function () {
    it('returns null without a site url', function () {
        assert.equal(getGiftPreviewUrl({settings: settings({}), config, siteData: null}), null);
    });

    // Portal reads an unset portal_products as "no restriction" and renders
    // every paid tier, so the preview has to state the list even when it's
    // empty — otherwise tiers hidden from Portal show up as giftable.
    it('limits the preview to tiers that are public in Portal', function () {
        const url = getGiftPreviewUrl({
            settings: settings(stripeSettings),
            tiers: [tier('bronze', 'public'), tier('silver', 'none'), tier('gold', 'none')],
            config,
            siteData
        });

        assert.equal(paramsOf(url).get('portalProducts'), 'bronze');
    });

    it('excludes free tiers, which cannot be gifted', function () {
        const url = getGiftPreviewUrl({
            settings: settings(stripeSettings),
            tiers: [tier('bronze', 'public'), tier('free', 'public', 'free')],
            config,
            siteData
        });

        assert.equal(paramsOf(url).get('portalProducts'), 'bronze');
    });

    it('passes an empty tier list when Portal offers none', function () {
        const url = getGiftPreviewUrl({
            settings: settings(stripeSettings),
            tiers: [tier('bronze', 'none')],
            config,
            siteData
        });

        assert.equal(paramsOf(url).get('portalProducts'), '');
    });

    it('anchors durations to the plans enabled in Portal', function () {
        const url = getGiftPreviewUrl({
            settings: settings({...stripeSettings, portal_plans: '["monthly"]'}),
            tiers: [tier('bronze', 'public')],
            config,
            siteData
        });

        assert.equal(paramsOf(url).get('isMonthly'), 'true');
        assert.equal(paramsOf(url).get('isYearly'), 'false');
    });
});
