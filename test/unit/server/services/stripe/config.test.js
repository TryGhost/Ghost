const should = require('should');
const sinon = require('sinon');
const UrlUtils = require('@tryghost/url-utils');

const configUtils = require('../../../../utils/configUtils');

const {getConfig} = require('../../../../../core/server/services/stripe/config');

/**
 * @param {object} options
 * @param {boolean} options.setDirect - Whether the "direct" keys should be set
 * @param {boolean} options.setConnect - Whether the connect_integration keys should be set
 */
function createSettingsMock({setDirect, setConnect}) {
    const getStub = sinon.stub();

    getStub.withArgs('members_signup_access').returns('all');
    getStub.withArgs('stripe_secret_key').returns(setDirect ? 'direct_secret' : null);
    getStub.withArgs('stripe_publishable_key').returns(setDirect ? 'direct_publishable' : null);
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
            all: ['canary'],
            canary: {
                admin: 'admin',
                content: 'content'
            }
        },
        defaultApiVersion: 'canary',
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

    afterEach(function () {
        configUtils.restore();
    });

    it('Uses direct keys when stripeDirect is true, regardles of which keys exist', function () {
        const fakeSettings = createSettingsMock({setDirect: true, setConnect: true});
        configUtils.set({
            stripeDirect: true
        });
        const fakeUrlUtils = createUrlUtilsMock();

        const config = getConfig(fakeSettings, configUtils.config, fakeUrlUtils);

        should.equal(config.publicKey, 'direct_publishable');
        should.equal(config.secretKey, 'direct_secret');
    });

    it('Does not use connect keys if stripeDirect is true, and the direct keys do not exist', function () {
        const fakeSettings = createSettingsMock({setDirect: false, setConnect: true});
        configUtils.set({
            stripeDirect: true
        });
        const fakeUrlUtils = createUrlUtilsMock();

        const config = getConfig(fakeSettings, configUtils.config, fakeUrlUtils);

        should.equal(config, null);
    });

    it('Uses connect keys when stripeDirect is false, and the connect keys exist', function () {
        const fakeSettings = createSettingsMock({setDirect: true, setConnect: true});
        configUtils.set({
            stripeDirect: false
        });
        const fakeUrlUtils = createUrlUtilsMock();

        const config = getConfig(fakeSettings, configUtils.config, fakeUrlUtils);

        should.equal(config.publicKey, 'connect_publishable');
        should.equal(config.secretKey, 'connect_secret');
    });

    it('Uses direct keys when stripeDirect is false, but the connect keys do not exist', function () {
        const fakeSettings = createSettingsMock({setDirect: true, setConnect: false});
        configUtils.set({
            stripeDirect: false
        });
        const fakeUrlUtils = createUrlUtilsMock();

        const config = getConfig(fakeSettings, configUtils.config, fakeUrlUtils);

        should.equal(config.publicKey, 'direct_publishable');
        should.equal(config.secretKey, 'direct_secret');
    });

    it('Includes the subdirectory in the webhookHandlerUrl', function () {
        configUtils.set({
            stripeDirect: false,
            url: 'http://site.com/subdir'
        });
        const fakeSettings = createSettingsMock({setDirect: true, setConnect: false});
        const fakeUrlUtils = createUrlUtilsMock();

        const config = getConfig(fakeSettings, configUtils.config, fakeUrlUtils);

        should.equal(config.webhookHandlerUrl, 'http://site.com/subdir/members/webhooks/stripe/');
    });
});
