const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../../utils/configUtils');
const SettingsHelpers = require('../../../../../core/server/services/settings-helpers/SettingsHelpers');
const crypto = require('crypto');

const mockValidationKey = 'validation_key';

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

    getStub.withArgs('members_email_auth_secret').returns(mockValidationKey);

    return {
        get: getStub
    };
}

describe('Settings Helpers', function () {
    describe('getActiveStripeKeys', function () {
        beforeEach(function () {
            configUtils.set({
                url: 'http://domain.tld/subdir',
                admin: {url: 'http://sub.domain.tld'}
            });
        });

        afterEach(async function () {
            await configUtils.restore();
        });

        it('Uses direct keys when stripeDirect is true, regardles of which keys exist', function () {
            const fakeSettings = createSettingsMock({setDirect: true, setConnect: true});
            configUtils.set({
                stripeDirect: true
            });
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}});
            const keys = settingsHelpers.getActiveStripeKeys();

            should.equal(keys.publicKey, 'direct_publishable');
            should.equal(keys.secretKey, 'direct_secret');
        });

        it('Does not use connect keys if stripeDirect is true, and the direct keys do not exist', function () {
            const fakeSettings = createSettingsMock({setDirect: false, setConnect: true});
            configUtils.set({
                stripeDirect: true
            });
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}});
            const keys = settingsHelpers.getActiveStripeKeys();

            should.equal(keys, null);
        });

        it('Uses connect keys when stripeDirect is false, and the connect keys exist', function () {
            const fakeSettings = createSettingsMock({setDirect: true, setConnect: true});
            configUtils.set({
                stripeDirect: false
            });
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}});
            const keys = settingsHelpers.getActiveStripeKeys();

            should.equal(keys.publicKey, 'connect_publishable');
            should.equal(keys.secretKey, 'connect_secret');
        });

        it('Uses direct keys when stripeDirect is false, but the connect keys do not exist', function () {
            const fakeSettings = createSettingsMock({setDirect: true, setConnect: false});
            configUtils.set({
                stripeDirect: false
            });
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}});
            const keys = settingsHelpers.getActiveStripeKeys();

            should.equal(keys.publicKey, 'direct_publishable');
            should.equal(keys.secretKey, 'direct_secret');
        });
    });

    describe('getMembersValidationKey', function () {
        it('returns a key that can be used to validate members', function () {
            const fakeSettings = createSettingsMock({setDirect: true, setConnect: true});
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}});
            const key = settingsHelpers.getMembersValidationKey();
            should.equal(key, 'validation_key');
        });
    });

    describe('createUnsubscribeUrl', function () {
        const memberUuid = 'memberuuid';
        const newsletterUuid = 'newsletteruuid';
        const urlUtils = {
            urlFor: sinon.stub().returns('http://domain.com/')
        };
        const memberUuidHash = crypto.createHmac('sha256', mockValidationKey).update(`${memberUuid}`).digest('hex');
        let fakeSettings;

        before(function () {
            fakeSettings = createSettingsMock({setDirect: true, setConnect: true});
        });

        afterEach(async function () {
            await configUtils.restore();
        });

        it('returns a generic unsubscribe url when no uuid is provided', function () {
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils});
            const url = settingsHelpers.createUnsubscribeUrl(null);
            should.equal(url, 'http://domain.com/unsubscribe/?preview=1');
        });

        it('returns a url that can be used to unsubscribe a member', function () {
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils});
            const url = settingsHelpers.createUnsubscribeUrl(memberUuid);
            should.equal(url, `http://domain.com/unsubscribe/?uuid=memberuuid&key=${memberUuidHash}`);
        });

        it('returns a url that can be used to unsubscribe a member for a given newsletter', function () {
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils});
            const url = settingsHelpers.createUnsubscribeUrl(memberUuid, {newsletterUuid});
            should.equal(url, `http://domain.com/unsubscribe/?uuid=memberuuid&key=${memberUuidHash}&newsletter=newsletteruuid`);
        });

        it('returns a url that can be used to unsubscribe a member from comments', function () {
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils});
            const url = settingsHelpers.createUnsubscribeUrl(memberUuid, {comments: true});
            should.equal(url, `http://domain.com/unsubscribe/?uuid=memberuuid&key=${memberUuidHash}&comments=1`);
        });
    });
});
