const should = require('should');
const UrlUtils = require('@tryghost/url-utils');
const MembersConfigProvider = require('../../../../core/server/services/members/config');
const sinon = require('sinon');

/**
 * @param {object} options
 * @param {boolean} options.stripeDirectValue - The value the stripeDirect config property should have
 */
function createConfigMock({stripeDirectValue}) {
    return {
        get: sinon.stub()
            .withArgs('stripeDirect').returns(stripeDirectValue)
    };
}

/**
 * @param {object} options
 * @param {boolean} options.setDirect - Whether the "direct" keys should be set
 * @param {boolean} options.setConnect - Whether the connect_integration keys should be set
 */
function createSettingsMock({setDirect, setConnect}) {
    const getStub = sinon.stub();

    getStub.withArgs('members_from_address').returns('noreply');
    getStub.withArgs('members_allow_free_signup').returns(true);
    getStub.withArgs('stripe_secret_key').returns(setDirect ? 'direct_secret' : null);
    getStub.withArgs('stripe_publishable_key').returns(setDirect ? 'direct_publishable' : null);
    getStub.withArgs('stripe_product_name').returns('Test');
    getStub.withArgs('stripe_plans').returns([{
        name: 'Monthly',
        currency: 'usd',
        interval: 'month',
        amount: 1000
    }, {
        name: 'Yearly',
        currency: 'usd',
        interval: 'year',
        amount: 10000
    }]);

    getStub.withArgs('stripe_connect_secret_key').returns(setConnect ? 'connect_secret' : null);
    getStub.withArgs('stripe_connect_publishable_key').returns(setConnect ? 'connect_publishable' : null);
    getStub.withArgs('stripe_connect_livemode').returns(true);
    getStub.withArgs('stripe_connect_display_name').returns('Test');
    getStub.withArgs('stripe_connect_account_id').returns('ac_XXXXXXXXXXXXX');

    return {
        get: getStub
    };
}

function createUrlUtilsMock({url = 'http://domain.tld/subdir', adminUrl = 'http://sub.domain.tld'} = {}) {
    return new UrlUtils({
        url,
        adminUrl,
        apiVersions: {
            all: ['v3'],
            v3: {
                admin: 'v3/admin',
                content: 'v3/content'
            }
        },
        defaultApiVersion: 'v3',
        slugs: ['ghost', 'rss', 'amp'],
        redirectCacheMaxAge: 31536000,
        baseApiPath: '/ghost/api'
    });
}

describe('Members - config', function () {
    it('Uses direct keys when stripeDirect is true, regardles of which keys exist', function () {
        const config = createConfigMock({stripeDirectValue: true});
        const settingsCache = createSettingsMock({setDirect: true, setConnect: Math.random() < 0.5});
        const urlUtils = createUrlUtilsMock();

        const membersConfig = new MembersConfigProvider({
            config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig.publicKey, 'direct_publishable');
        should.equal(paymentConfig.secretKey, 'direct_secret');
    });

    it('Does not use connect keys if stripeDirect is true, and the direct keys do not exist', function () {
        const config = createConfigMock({stripeDirectValue: true});
        const settingsCache = createSettingsMock({setDirect: false, setConnect: true});
        const urlUtils = createUrlUtilsMock();

        const membersConfig = new MembersConfigProvider({
            config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig, null);
    });

    it('Uses connect keys when stripeDirect is false, and the connect keys exist', function () {
        const config = createConfigMock({stripeDirectValue: false});
        const settingsCache = createSettingsMock({setDirect: true, setConnect: true});
        const urlUtils = createUrlUtilsMock();

        const membersConfig = new MembersConfigProvider({
            config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig.publicKey, 'connect_publishable');
        should.equal(paymentConfig.secretKey, 'connect_secret');
    });

    it('Uses direct keys when stripeDirect is false, but the connect keys do not exist', function () {
        const config = createConfigMock({stripeDirectValue: false});
        const settingsCache = createSettingsMock({setDirect: true, setConnect: false});
        const urlUtils = createUrlUtilsMock();

        const membersConfig = new MembersConfigProvider({
            config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig.publicKey, 'direct_publishable');
        should.equal(paymentConfig.secretKey, 'direct_secret');
    });

    it('Includes the subdirectory in the webhookHandlerUrl', function () {
        const config = createConfigMock({stripeDirectValue: false});
        const settingsCache = createSettingsMock({setDirect: true, setConnect: false});
        const urlUtils = createUrlUtilsMock({
            url: 'http://site.com/subdir'
        });

        const membersConfig = new MembersConfigProvider({
            config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig.webhookHandlerUrl, 'http://site.com/subdir/members/webhooks/stripe/');
    });
});
