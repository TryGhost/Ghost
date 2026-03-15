const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const UrlUtils = require('@tryghost/url-utils');

const configUtils = require('../../../../utils/config-utils');

const {getConfig} = require('../../../../../core/server/services/stripe/config');

function createSettingsHelpersMock() {
    return {
        getActiveStripeKeys: sinon.stub().returns({
            secretKey: 'direct_secret',
            publicKey: 'direct_publishable'
        })
    };
}

function createUrlUtilsMock() {
    return new UrlUtils({
        getSubdir: configUtils.config.getSubdir,
        getSiteUrl: configUtils.config.getSiteUrl,
        getAdminUrl: configUtils.config.getAdminUrl,
        slugs: ['ghost', 'rss', 'amp'],
        redirectCacheMaxAge: 31536000,
        baseApiPath: '/ghost/api'
    });
}

describe('Stripe - config', function () {
    const ignoreCustomerConfigKey = 'stripeWebhookCustomerIgnoreList';

    beforeEach(function () {
        configUtils.set({
            url: 'http://domain.tld/subdir',
            admin: {url: 'http://sub.domain.tld'}
        });
    });

    afterEach(async function () {
        configUtils.set(ignoreCustomerConfigKey, null);
        await configUtils.restore();
    });

    it('Returns null if Stripe not connected', function () {
        configUtils.set({
            stripeDirect: false,
            url: 'http://site.com/subdir'
        });
        const settingsHelpers = {
            getActiveStripeKeys: sinon.stub().returns(null)
        };
        const config = getConfig({settingsHelpers, config: configUtils.config, urlUtils: {}});

        assert.equal(config, null);
    });

    it('Includes the subdirectory in the webhookHandlerUrl', function () {
        configUtils.set({
            url: 'http://site.com/subdir'
        });
        const settingsHelpers = createSettingsHelpersMock();
        const fakeUrlUtils = createUrlUtilsMock();

        const config = getConfig({settingsHelpers, config: configUtils.config, urlUtils: fakeUrlUtils});

        assert.equal(config.secretKey, 'direct_secret');
        assert.equal(config.publicKey, 'direct_publishable');
        assert.equal(config.webhookHandlerUrl, 'http://site.com/subdir/members/webhooks/stripe/');

        assertExists(config.checkoutSessionSuccessUrl);
        assertExists(config.checkoutSessionCancelUrl);
        assertExists(config.checkoutSetupSessionSuccessUrl);
        assertExists(config.checkoutSetupSessionCancelUrl);
        assertExists(config.billingPortalReturnUrl);
    });

    it('Parses Stripe webhook customer ignore list from config', function () {
        configUtils.set(ignoreCustomerConfigKey, ['cust_123', ' cust_456 ']);
        const settingsHelpers = createSettingsHelpersMock();
        const fakeUrlUtils = createUrlUtilsMock();

        const config = getConfig({settingsHelpers, config: configUtils.config, urlUtils: fakeUrlUtils});

        assert.deepEqual(config.webhookCustomerIgnoreList, ['cust_123', 'cust_456']);
    });
});
