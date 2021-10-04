const should = require('should');
const UrlUtils = require('@tryghost/url-utils');
const MembersConfigProvider = require('../../../../core/server/services/members/config');

const configUtils = require('../../../utils/configUtils');
const sinon = require('sinon');

/**
 * @param {object} options
 * @param {boolean} options.setDirect - Whether the "direct" keys should be set
 * @param {boolean} options.setConnect - Whether the connect_integration keys should be set
 */
function createSettingsMock({setDirect, setConnect}) {
    const getStub = sinon.stub();

    getStub.withArgs('members_from_address').returns('noreply');
    getStub.withArgs('members_signup_access').returns('all');
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

function createUrlUtilsMock() {
    return new UrlUtils({
        getSubdir: configUtils.config.getSubdir,
        getSiteUrl: configUtils.config.getSiteUrl,
        getAdminUrl: configUtils.config.getAdminUrl,
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
    beforeEach(function () {
        configUtils.set({
            url: 'http://domain.tld/subdir',
            admin: {url: 'http://sub.domain.tld'}
        });
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('Includes the subdirectory in the webhookHandlerUrl', function () {
        configUtils.set({
            stripeDirect: false,
            url: 'http://site.com/subdir'
        });
        const settingsCache = createSettingsMock({setDirect: true, setConnect: false});
        const urlUtils = createUrlUtilsMock();

        const membersConfig = new MembersConfigProvider({
            config: configUtils.config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig.webhookHandlerUrl, 'http://site.com/subdir/members/webhooks/stripe/');
    });
});
