const assert = require('assert');
const SingleUseTokenProvider = require('../../../core/server/services/members/SingleUseTokenProvider');
const settingsService = require('../../../core/server/services/settings/settings-service');
const settingsCache = require('../../../core/shared/settings-cache');
const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {stringMatching, anyEtag, anyUuid, anyContentLength} = matchers;
const models = require('../../../core/server/models');
const {anyErrorId} = matchers;

const CURRENT_SETTINGS_COUNT = 69;

const settingsMatcher = {};

const publicHashSettingMatcher = {
    value: stringMatching(/[a-z0-9]{30}/)
};

const labsSettingMatcher = {
    value: stringMatching(/\{[^\s]+\}/)
};

const matchSettingsArray = (length) => {
    const settingsArray = new Array(length).fill(settingsMatcher);

    if (length > 26) {
        // Added a setting that is alphabetically before 'public_hash'? then you need to increment this counter.
        // Item at index x is the public hash, which is always different
        settingsArray[26] = publicHashSettingMatcher;
    }

    if (length > 58) {
        // Added a setting that is alphabetically before 'labs'? then you need to increment this counter.
        // Item at index x is the lab settings, which changes as we add and remove features
        settingsArray[58] = labsSettingMatcher;
    }

    return settingsArray;
};

describe('Settings API', function () {
    let agent, membersService;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();

        membersService = require('../../../core/server/services/members');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
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
                    'content-length': anyContentLength
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
                    etag: anyEtag
                });
        });

        it('Requesting core settings by group ignores the parameter and returns no settings', async function () {
            await agent
                .get('settings/?group=core')
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });
    });

    describe('Edit', function () {
        it('Can edit a setting', async function () {
            const settingsToChange = [
                {
                    key: 'title',
                    value: []
                },
                {
                    key: 'codeinjection_head',
                    value: null
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
                    'content-length': anyContentLength
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
                    'content-length': anyContentLength
                })
                .expect(({body}) => {
                    const emailVerificationRequired = body.settings.find(setting => setting.key === 'email_verification_required');
                    assert.strictEqual(emailVerificationRequired.value, false);
                });
            mockManager.assert.sentEmailCount(0);
        });

        it('editing members_support_address triggers email verification flow', async function () {
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
                    'content-length': anyContentLength
                })
                .expect(({body}) => {
                    const membersSupportAddress = body.settings.find(setting => setting.key === 'members_support_address');
                    assert.strictEqual(membersSupportAddress.value, 'noreply');

                    assert.deepEqual(body.meta, {
                        sent_email_verification: ['members_support_address']
                    });
                });

            mockManager.assert.sentEmailCount(1);
            mockManager.assert.sentEmail({
                subject: 'Verify email address',
                to: 'support@example.com'
            });
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
                    'content-length': anyContentLength
                })
                .expect(({body}) => {
                    const membersSupportAddress = body.settings.find(setting => setting.key === 'members_support_address');
                    assert.strictEqual(membersSupportAddress.value, 'support@example.com');

                    assert.deepEqual(body.meta, {});
                });

            mockManager.assert.sentEmailCount(0);
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
                    'content-length': anyContentLength
                })
                .expect(({body}) => {
                    const membersSupportAddress = body.settings.find(setting => setting.key === 'members_support_address');
                    assert.strictEqual(membersSupportAddress.value, 'support@example.com');
                });

            mockManager.assert.sentEmailCount(0);
        });

        it('cannot update invalid keys via token', async function () {
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
                    etag: anyEtag
                });
        });
    });

    describe('stripe connect', function () {
        it('can do disconnectStripeConnectIntegration', async function () {
            await agent
                .delete('/settings/stripe/connect/')
                .expectStatus(204)
                .expectEmptyBody()
                .matchHeaderSnapshot({
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
                    etag: anyEtag
                });
        });
    });
});
