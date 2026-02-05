const assert = require('node:assert/strict');
const should = require('should');
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
    beforeEach(function () {
        configUtils.set({
            url: 'http://domain.tld/subdir',
            admin: {url: 'http://sub.domain.tld'}
        });
    });

    afterEach(async function () {
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

        should.exist(config.checkoutSessionSuccessUrl);
        should.exist(config.checkoutSessionCancelUrl);
        should.exist(config.checkoutSetupSessionSuccessUrl);
        should.exist(config.checkoutSetupSessionCancelUrl);
        should.exist(config.billingPortalReturnUrl);
    });
});
