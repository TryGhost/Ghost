const assert = require('node:assert/strict');
const sinon = require('sinon');

const MembersConfigProvider = require('../../../../../core/server/services/members/members-config-provider');

const urlUtils = require('../../../../utils/url-utils');
const configUtils = require('../../../../utils/config-utils');

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

    getStub.withArgs('members_private_key').returns('PRIVATE');
    getStub.withArgs('members_public_key').returns('PUBLIC');

    return {
        get: getStub
    };
}

describe('Members - config', function () {
    let membersConfig;

    beforeEach(function () {
        configUtils.set({
            url: 'http://domain.tld/subdir',
            admin: {url: 'http://sub.domain.tld'}
        });

        membersConfig = new MembersConfigProvider({
            config: configUtils.config,
            settingsCache: createSettingsMock({setDirect: true, setConnect: false}),
            urlUtils: urlUtils.stubUrlUtilsFromConfig()
        });
    });

    afterEach(async function () {
        await configUtils.restore();
        await urlUtils.restore();
        sinon.restore();
    });

    it('can get correct tokenConfig', function () {
        const {issuer, publicKey, privateKey} = membersConfig.getTokenConfig();

        assert.equal(issuer, 'http://domain.tld/subdir/members/api');
        assert.equal(publicKey, 'PUBLIC');
        assert.equal(privateKey, 'PRIVATE');
    });

    it('can get correct signinUrl', function () {
        const signinUrl = new URL(membersConfig.getSigninURL('a', 'b'));
        assert.equal(signinUrl.origin + signinUrl.pathname, 'http://domain.tld/subdir/members/');
        assert.equal(signinUrl.searchParams.get('token'), 'a');
        assert.equal(signinUrl.searchParams.get('action'), 'b');
    });

    it('can get correct signinUrl with referrer', function () {
        const signinUrl = new URL(membersConfig.getSigninURL('a', 'b', 'http://domain.tld/my-post/'));
        assert.equal(signinUrl.origin + signinUrl.pathname, 'http://domain.tld/subdir/members/');
        assert.equal(signinUrl.searchParams.get('token'), 'a');
        assert.equal(signinUrl.searchParams.get('action'), 'b');
        assert.equal(signinUrl.searchParams.get('r'), 'http://domain.tld/my-post/');
    });

    it('can get correct signinUrl with referrer and otcVerification', function () {
        const signinUrl = new URL(membersConfig.getSigninURL('a', 'b', 'c', 'd'));
        assert.equal(signinUrl.origin + signinUrl.pathname, 'http://domain.tld/subdir/members/');
        assert.equal(signinUrl.searchParams.get('token'), 'a');
        assert.equal(signinUrl.searchParams.get('action'), 'b');
        assert.equal(signinUrl.searchParams.get('r'), 'c');
        assert.equal(signinUrl.searchParams.get('otc_verification'), 'd');
    });
});
