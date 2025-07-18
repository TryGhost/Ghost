const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../../utils/configUtils');
const SettingsHelpers = require('../../../../../core/server/services/settings-helpers/SettingsHelpers');
const crypto = require('crypto');
const assert = require('assert').strict;

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

    getStub.withArgs('site_uuid').returns('a592f6b7-bbc1-413c-933b-afc7fe92a32e');

    getStub.withArgs('members_email_auth_secret').returns(mockValidationKey);

    return {
        get: getStub
    };
}

describe('Settings Helpers', function () {
    let limitService = {};

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
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}, labs: {}, limitService});
            const keys = settingsHelpers.getActiveStripeKeys();

            should.equal(keys.publicKey, 'direct_publishable');
            should.equal(keys.secretKey, 'direct_secret');
        });

        it('Does not use connect keys if stripeDirect is true, and the direct keys do not exist', function () {
            const fakeSettings = createSettingsMock({setDirect: false, setConnect: true});
            configUtils.set({
                stripeDirect: true
            });
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}, labs: {}, limitService});
            const keys = settingsHelpers.getActiveStripeKeys();

            should.equal(keys, null);
        });

        it('Uses connect keys when stripeDirect is false, and the connect keys exist', function () {
            const fakeSettings = createSettingsMock({setDirect: true, setConnect: true});
            configUtils.set({
                stripeDirect: false
            });
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}, labs: {}, limitService});
            const keys = settingsHelpers.getActiveStripeKeys();

            should.equal(keys.publicKey, 'connect_publishable');
            should.equal(keys.secretKey, 'connect_secret');
        });

        it('Uses direct keys when stripeDirect is false, but the connect keys do not exist', function () {
            const fakeSettings = createSettingsMock({setDirect: true, setConnect: false});
            configUtils.set({
                stripeDirect: false
            });
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}, labs: {}, limitService});
            const keys = settingsHelpers.getActiveStripeKeys();

            should.equal(keys.publicKey, 'direct_publishable');
            should.equal(keys.secretKey, 'direct_secret');
        });
    });

    describe('getMembersValidationKey', function () {
        it('returns a key that can be used to validate members', function () {
            const fakeSettings = createSettingsMock({setDirect: true, setConnect: true});
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils: {}, labs: {}, limitService});
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
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const url = settingsHelpers.createUnsubscribeUrl(null);
            should.equal(url, 'http://domain.com/unsubscribe/?preview=1');
        });

        it('returns a url that can be used to unsubscribe a member', function () {
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const url = settingsHelpers.createUnsubscribeUrl(memberUuid);
            should.equal(url, `http://domain.com/unsubscribe/?uuid=memberuuid&key=${memberUuidHash}`);
        });

        it('returns a url that can be used to unsubscribe a member for a given newsletter', function () {
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const url = settingsHelpers.createUnsubscribeUrl(memberUuid, {newsletterUuid});
            should.equal(url, `http://domain.com/unsubscribe/?uuid=memberuuid&key=${memberUuidHash}&newsletter=newsletteruuid`);
        });

        it('returns a url that can be used to unsubscribe a member from comments', function () {
            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const url = settingsHelpers.createUnsubscribeUrl(memberUuid, {comments: true});
            should.equal(url, `http://domain.com/unsubscribe/?uuid=memberuuid&key=${memberUuidHash}&comments=1`);
        });
    });

    describe('getAllBlockedEmailDomains', function () {
        let fakeSettings;
        const urlUtils = {
            urlFor: sinon.stub().returns('http://domain.com/')
        };

        before(function () {
            fakeSettings = createSettingsMock({setDirect: true, setConnect: true});
        });

        afterEach(async function () {
            await configUtils.restore();
        });

        it('returns an empty array when both config and settings are empty', function () {
            fakeSettings.get.withArgs('blocked_email_domains').returns([]);
            configUtils.set({
                spam: {
                    blocked_email_domains: []
                }
            });

            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const domains = settingsHelpers.getAllBlockedEmailDomains();

            assert.deepEqual(domains, []);
        });

        it('returns an empty array when settings or config is malformed', function () {
            fakeSettings.get.withArgs('blocked_email_domains').returns('not an array');
            configUtils.set({
                spam: {
                    blocked_email_domains: 'not an array'
                }
            });

            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const domains = settingsHelpers.getAllBlockedEmailDomains();

            assert.deepEqual(domains, []);
        });

        it('returns an empty array when settings or config are undefined', function () {
            fakeSettings.get.withArgs('blocked_email_domains').returns(undefined);
            configUtils.set({
                spam: {
                    blocked_email_domains: undefined
                }
            });

            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const domains = settingsHelpers.getAllBlockedEmailDomains();

            assert.deepEqual(domains, []);
        });

        it('returns an empty array when settings or config are null', function () {
            fakeSettings.get.withArgs('blocked_email_domains').returns(null);
            configUtils.set({
                spam: {
                    blocked_email_domains: null
                }
            });

            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const domains = settingsHelpers.getAllBlockedEmailDomains();

            assert.deepEqual(domains, []);
        });

        it('returns an array of unique domains', function () {
            fakeSettings.get.withArgs('blocked_email_domains').returns(['domain.com', 'settingsdomain.com']);
            configUtils.set({
                spam: {
                    blocked_email_domains: ['configdomain.com', '@domain.com']
                }
            });

            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const domains = settingsHelpers.getAllBlockedEmailDomains();

            assert.deepEqual(domains, ['configdomain.com', 'domain.com', 'settingsdomain.com']);
        });

        it('normalises the list of email domains and filters out invalid domains', function () {
            fakeSettings.get.withArgs('blocked_email_domains').returns(['Domain.com', '@example.com', 'hello@spam.xyz', 'bar', '']);
            configUtils.set({
                spam: {
                    blocked_email_domains: ['configDomain.com', '@configExample.com', 'foo', '']
                }
            });

            const settingsHelpers = new SettingsHelpers({settingsCache: fakeSettings, config: configUtils.config, urlUtils, labs: {}, limitService});
            const domains = settingsHelpers.getAllBlockedEmailDomains();

            assert.deepEqual(domains, ['configdomain.com', 'configexample.com', 'domain.com', 'example.com', 'spam.xyz']);
        });
    });

    describe('isSocialWebEnabled', function () {
        const config = configUtils.config;
        let settingsCache;
        let urlUtils;
        let labs = {};

        beforeEach(function () {
            settingsCache = {
                get: sinon.stub().withArgs('social_web').returns(true)
            };
            urlUtils = {
                getSiteUrl: sinon.stub().returns('http://example.com/'),
                getSubdir: sinon.stub().returns('')
            };
            limitService = {
                isDisabled: sinon.stub().withArgs('limitSocialWeb').returns(undefined)
            };
        });

        afterEach(function () {
            sinon.restore();
        });

        it('returns false when the UI setting is set to false', function () {
            settingsCache.get.withArgs('social_web').returns(false);

            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isSocialWebEnabled();

            assert.equal(isEnabled, false);
        });

        it('returns false when social web is disabled for a Ghost (Pro) user', function () {
            limitService.isDisabled.withArgs('limitSocialWeb').returns(true);

            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isSocialWebEnabled();

            assert.equal(isEnabled, false);
        });

        it('returns false when the site is hosted on a subdirectory', function () {
            urlUtils.getSubdir.returns('blog');

            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isSocialWebEnabled();

            assert.equal(isEnabled, false);
        });

        it('returns false if the site is hosted on a localhost or IP address in production', function () {
            urlUtils.getSiteUrl.returns('http://localhost:2368');
            sinon.stub(process.env, 'NODE_ENV').value('production');

            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isSocialWebEnabled();

            assert.equal(isEnabled, false);
        });

        it('returns true otherwise', function () {
            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isSocialWebEnabled();

            assert.equal(isEnabled, true);
        });
    });

    describe('isWebAnalyticsEnabled', function () {
        const config = configUtils.config;
        let settingsCache;
        let urlUtils;
        let labs;
        beforeEach(function () {
            settingsCache = {
                get: sinon.stub().withArgs('web_analytics').returns(true)
            };
            urlUtils = {
                getSiteUrl: sinon.stub().returns('http://example.com/'),
                getSubdir: sinon.stub().returns('')
            };
            limitService = {
                isDisabled: sinon.stub().withArgs('limitAnalytics').returns(undefined)
            };
            configUtils.set({
                tinybird: {
                    tracker: {
                        endpoint: 'https://api.tinybird.co/v0/events'
                    },
                    workspaceId: '1234567890',
                    adminToken: '1234567890'
                }
            });
        });

        afterEach(function () {
            sinon.restore();
        });

        it('returns false when the UI setting is set to false', function () {
            settingsCache.get.withArgs('web_analytics').returns(false);

            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isWebAnalyticsEnabled();

            assert.equal(isEnabled, false);
        });

        it('returns false when the config is not valid', function () {
            configUtils.set({
                tinybird: undefined
            });

            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isWebAnalyticsEnabled();

            assert.equal(isEnabled, false);
        });

        it('returns false when web analytics is disabled for a Ghost (Pro) user', function () {
            limitService.isDisabled.withArgs('limitAnalytics').returns(true);

            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isWebAnalyticsEnabled();

            assert.equal(isEnabled, false);
        });

        it('returns true otherwise', function () {
            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isWebAnalyticsEnabled();

            assert.equal(isEnabled, true);
        });

        it('returns true when config is set up for local dev', function () {
            configUtils.set({
                tinybird: {
                    tracker: {
                        endpoint: 'https://api.tinybird.co/v0/events'
                    },
                    stats: {
                        local: {
                            enabled: true
                        }
                    }
                }
            });

            const settingsHelpers = new SettingsHelpers({settingsCache, config, urlUtils, labs, limitService});
            const isEnabled = settingsHelpers.isWebAnalyticsEnabled();

            assert.equal(isEnabled, true);
        });
    });
});

