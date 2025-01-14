const assert = require('assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const SingleUseTokenProvider = require('../../../core/server/services/members/SingleUseTokenProvider');
const settingsCache = require('../../../core/shared/settings-cache');
const {agentProvider, fixtureManager, mockManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {stringMatching, anyEtag, anyUuid, anyContentLength, anyContentVersion} = matchers;
const models = require('../../../core/server/models');
const {anyErrorId} = matchers;

const CURRENT_SETTINGS_COUNT = 87;

const settingsMatcher = {};

const publicHashSettingMatcher = {
    key: 'public_hash',
    value: stringMatching(/[a-z0-9]{30}/)
};

const labsSettingMatcher = {
    key: 'labs',
    value: stringMatching(/\{[^\s]+\}/)
};

const matchSettingsArray = (length) => {
    const settingsArray = new Array(length).fill(settingsMatcher);

    if (length > 26) {
        // Added a setting that is alphabetically before 'public_hash'? then you need to increment this counter.
        // Item at index x is the public hash, which is always different
        settingsArray[26] = publicHashSettingMatcher;
    }

    if (length > 61) {
        // Added a setting that is alphabetically before 'labs'? then you need to increment this counter.
        // Item at index x is the lab settings, which changes as we add and remove features
        settingsArray[61] = labsSettingMatcher;
    }

    return settingsArray;
};

describe('Settings API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
    });

    describe('Browse', function () {
        it('Can request all settings', async function () {
            await agent
                .get('settings/')
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                });
        });

        it('Can request settings by group', async function () {
            await agent
                .get('settings/?group=theme')
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(1)
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Requesting core settings by group ignores the parameter and returns no settings', async function () {
            await agent
                .get('settings/?group=core')
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Edit', function () {
        it('Can edit a setting', async function () {
            const settingsToChange = [
                {
                    key: 'title',
                    value: ''
                },
                {
                    key: 'codeinjection_head',
                    value: null
                },
                {
                    key: 'announcement_content',
                    value: '<p>Great news coming soon!</p>'
                },
                {
                    key: 'announcement_visibility',
                    value: JSON.stringify(['visitors', 'free_members'])
                },
                {
                    key: 'navigation',
                    value: JSON.stringify([{
                        label: 'label1'
                    }])
                },
                {
                    key: 'slack_username',
                    value: 'New Slack Username'
                },
                {
                    key: 'is_private',
                    value: false
                },
                {
                    key: 'meta_title',
                    value: 'SEO title'
                },
                {
                    key: 'meta_description',
                    value: 'SEO description'
                },
                {
                    key: 'og_image',
                    value: '/content/images/2019/07/facebook.png'
                },
                {
                    key: 'og_title',
                    value: 'facebook title'
                },
                {
                    key: 'og_description',
                    value: 'facebook description'
                },
                {
                    key: 'twitter_image',
                    value: '/content/images/2019/07/twitter.png'
                },
                {
                    key: 'twitter_title',
                    value: 'twitter title'
                },
                {
                    key: 'twitter_description',
                    value: 'twitter description'
                },
                {
                    key: 'locale',
                    value: 'ua'
                },
                {
                    key: 'labs',
                    value: JSON.stringify({})
                },
                {
                    key: 'timezone',
                    value: 'Pacific/Auckland'
                },
                {
                    key: 'unsplash',
                    value: false
                }
            ];

            await agent.put('settings/')
                .body({
                    settings: settingsToChange
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            mockManager.assert.sentEmailCount(0);
        });

        it('removes image size prefixes when setting the icon', async function () {
            const settingsToChange = [
                {
                    key: 'icon',
                    value: '/content/images/size/w256h256/2019/07/icon.png'
                }
            ];

            const {body} = await agent.put('settings/')
                .body({
                    settings: settingsToChange
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                });

            // Check returned WITH prefix
            const val = body.settings.find(setting => setting.key === 'icon');
            assert.ok(val);
            assert.equal(val.value, 'http://127.0.0.1:2369/content/images/size/w256h256/2019/07/icon.png');

            // Check if not changed (also check internal ones)
            const afterValue = settingsCache.get('icon');
            assert.equal(afterValue, 'http://127.0.0.1:2369/content/images/2019/07/icon.png');

            mockManager.assert.sentEmailCount(0);
        });

        it('cannot edit uneditable settings', async function () {
            await agent.put('settings/')
                .body({
                    settings: [{key: 'email_verification_required', value: true}]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                })
                .expect(({body}) => {
                    const emailVerificationRequired = body.settings.find(setting => setting.key === 'email_verification_required');
                    assert.equal(emailVerificationRequired.value, false);
                });
            mockManager.assert.sentEmailCount(0);
        });

        it('does not trigger email verification flow if members_support_address remains the same', async function () {
            await models.Settings.edit({
                key: 'members_support_address',
                value: 'support@example.com'
            });

            await agent.put('settings/')
                .body({
                    settings: [{key: 'members_support_address', value: 'support@example.com'}]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                })
                .expect(({body}) => {
                    const membersSupportAddress = body.settings.find(setting => setting.key === 'members_support_address');
                    assert.equal(membersSupportAddress.value, 'support@example.com');

                    assert.deepEqual(body.meta, {});
                });

            mockManager.assert.sentEmailCount(0);
        });

        it('fails to edit setting with unsupported announcement_visibility value', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            const settingsToChange = [
                {
                    key: 'announcement_visibility',
                    value: JSON.stringify(['invalid value'])
                }
            ];

            await agent.put('settings/')
                .body({
                    settings: settingsToChange
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            sinon.assert.calledOnce(loggingStub);
        });

        it('fails to edit setting with unsupported announcement_background value', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            const settingsToChange = [
                {
                    key: 'announcement_background',
                    value: 'not a background value'
                }
            ];

            await agent.put('settings/')
                .body({
                    settings: settingsToChange
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            sinon.assert.calledOnce(loggingStub);
        });
    });

    describe('verify key update', function () {
        it('can update members_support_address via token', async function () {
            const token = await (new SingleUseTokenProvider({
                SingleUseTokenModel: models.SingleUseToken,
                validityPeriod: 24 * 60 * 60 * 1000,
                validityPeriodAfterUsage: 10 * 60 * 1000,
                maxUsageCount: 1
            })).create({key: 'members_support_address', value: 'support@example.com'});
            await agent.put('settings/verifications/')
                .body({
                    token
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                })
                .expect(({body}) => {
                    const membersSupportAddress = body.settings.find(setting => setting.key === 'members_support_address');
                    assert.equal(membersSupportAddress.value, 'support@example.com');
                });

            mockManager.assert.sentEmailCount(0);
        });

        it('cannot update invalid keys via token', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            const token = await (new SingleUseTokenProvider({
                SingleUseTokenModel: models.SingleUseToken,
                validityPeriod: 24 * 60 * 60 * 1000,
                validityPeriodAfterUsage: 10 * 60 * 1000,
                maxUsageCount: 1
            })).create({key: 'members_support_address_invalid', value: 'support@example.com'});
            await agent.put('settings/verifications/')
                .body({
                    token
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            sinon.assert.calledOnce(loggingStub);
        });
    });

    describe('stripe connect', function () {
        it('can do disconnectStripeConnectIntegration', async function () {
            await agent
                .delete('/settings/stripe/connect/')
                .expectStatus(204)
                .expectEmptyBody()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            const stripeSettings = [
                'stripe_connect_publishable_key',
                'stripe_connect_secret_key',
                'stripe_connect_livemode',
                'stripe_connect_display_name',
                'stripe_connect_account_id',
                'members_stripe_webhook_id',
                'members_stripe_webhook_secret'
            ];

            // Assert that the settings are changed as a side effect
            await agent.get('settings/')
                .expect(({body}) => {
                    body.settings.forEach((setting) => {
                        if (stripeSettings.includes(setting.key)) {
                            assert.equal(setting.value, null);
                        }
                    });
                });
        });

        it('Can attempt to connect to stripe', async function () {
            const settingsToChange = [
                {
                    key: 'stripe_connect_integration_token',
                    value: JSON.stringify({
                        s: 'session_state',
                        p: 'public_key',
                        a: 'secret_key',
                        l: true,
                        n: 'Display Name',
                        i: 'account_id'

                    })
                }
            ];

            await agent.put('settings/')
                .body({
                    settings: settingsToChange
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyUuid
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Managed email without custom sending domain', function () {
        this.beforeEach(function () {
            configUtils.set('hostSettings:managedEmail:enabled', true);
            configUtils.set('hostSettings:managedEmail:sendingDomain', null);
            configUtils.set('mail:from', 'default@email.com');
        });

        it('editing members_support_address triggers email verification flow', async function () {
            const currentSetting = settingsCache.get('members_support_address');
            assert(currentSetting !== 'othersupport@example.com', 'This test requires a changed email address');

            await agent.put('settings/')
                .body({
                    settings: [{key: 'members_support_address', value: 'othersupport@example.com'}]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                })
                .expect(({body}) => {
                    const membersSupportAddress = body.settings.find(setting => setting.key === 'members_support_address');
                    assert.equal(membersSupportAddress.value, currentSetting);

                    assert.deepEqual(body.meta, {
                        sent_email_verification: ['members_support_address']
                    });
                });

            mockManager.assert.sentEmailCount(1);
            mockManager.assert.sentEmail({
                subject: 'Verify email address',
                to: 'othersupport@example.com'
            });
        });

        it('editing members_support_address equaling default does not trigger verification flow', async function () {
            await agent.put('settings/')
                .body({
                    settings: [{key: 'members_support_address', value: 'default@email.com'}]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                });

            mockManager.assert.sentEmailCount(0);
        });
    });

    describe('Managed email with custom sending domain', function () {
        this.beforeEach(function () {
            configUtils.set('hostSettings:managedEmail:enabled', true);
            configUtils.set('hostSettings:managedEmail:sendingDomain', 'sendingdomain.com');
            configUtils.set('mail:from', 'default@email.com');
        });

        it('editing members_support_address without matching domain triggers email verification flow', async function () {
            const currentSetting = settingsCache.get('members_support_address');
            assert(currentSetting !== 'othersupport@example.com', 'This test requires a changed email address');

            await agent.put('settings/')
                .body({
                    settings: [{key: 'members_support_address', value: 'othersupport@example.com'}]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                })
                .expect(({body}) => {
                    const membersSupportAddress = body.settings.find(setting => setting.key === 'members_support_address');
                    assert.equal(membersSupportAddress.value, currentSetting);

                    assert.deepEqual(body.meta, {
                        sent_email_verification: ['members_support_address']
                    });
                });

            mockManager.assert.sentEmailCount(1);
            mockManager.assert.sentEmail({
                subject: 'Verify email address',
                to: 'othersupport@example.com'
            });
        });

        it('editing members_support_address with matching domain does not trigger email verification flow', async function () {
            const currentSetting = settingsCache.get('members_support_address');
            assert(currentSetting !== 'support@sendingdomain.com', 'This test requires a changed email address');

            await agent.put('settings/')
                .body({
                    settings: [{key: 'members_support_address', value: 'support@sendingdomain.com'}]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                });

            mockManager.assert.sentEmailCount(0);
        });

        it('editing members_support_address equaling default does not trigger verification flow', async function () {
            await agent.put('settings/')
                .body({
                    settings: [{key: 'members_support_address', value: 'default@email.com'}]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                });

            mockManager.assert.sentEmailCount(0);
        });
    });

    describe('Self hoster without managed email', function () {
        this.beforeEach(function () {
            configUtils.set('hostSettings:managedEmail:enabled', false);
            configUtils.set('hostSettings:managedEmail:sendingDomain', '');
        });

        it('editing members_support_address does not trigger email verification flow', async function () {
            const currentSetting = settingsCache.get('members_support_address');
            assert(currentSetting !== 'support@customdomain.com', 'This test requires a changed email address');

            await agent.put('settings/')
                .body({
                    settings: [{key: 'members_support_address', value: 'support@customdomain.com'}]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                });

            mockManager.assert.sentEmailCount(0);
        });

        it('editing members_support_address equaling default does not trigger verification flow', async function () {
            await agent.put('settings/')
                .body({
                    settings: [{key: 'members_support_address', value: 'default@email.com'}]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    settings: matchSettingsArray(CURRENT_SETTINGS_COUNT)
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                });

            mockManager.assert.sentEmailCount(0);
        });
    });
});
