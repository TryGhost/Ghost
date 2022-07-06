const assert = require('assert');
const settingsCache = require('../../../core/shared/settings-cache');
const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {stringMatching, anyEtag, anyUuid} = matchers;

const CURRENT_SETTINGS_COUNT = 67;

const settingsMatcher = {};

const publicHashSettingMatcher = {
    value: stringMatching(/[a-z0-9]{30}/)
};

const matchSettingsArray = (length) => {
    const settingsArray = new Array(length).fill(settingsMatcher);

    if (length > 25) {
        // Item at index 25 is the public hash, which is always different
        settingsArray[25] = publicHashSettingMatcher;
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
                    etag: anyEtag
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
                    etag: anyEtag
                });
            
            // Check returned WITH prefix
            const val = body.settings.find(setting => setting.key === 'icon');
            assert.ok(val);
            assert.equal(val.value, 'http://127.0.0.1:2369/content/images/size/w256h256/2019/07/icon.png');

            // Check if not changed (also check internal ones)
            const afterValue = settingsCache.get('icon');
            assert.equal(afterValue, 'http://127.0.0.1:2369/content/images/2019/07/icon.png');
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
                    etag: anyEtag
                })
                .expect(({body}) => {
                    const emailVerificationRequired = body.settings.find(setting => setting.key === 'email_verification_required');
                    assert.strictEqual(emailVerificationRequired.value, false);
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

    // @TODO Fixing https://github.com/TryGhost/Team/issues/584 should result in thes tests changing
    describe('deprecated', function () {
        it('can do updateMembersEmail', async function () {
            await agent
                .post('settings/members/email/')
                .body({
                    email: 'test@test.com',
                    type: 'supportAddressUpdate'
                })
                .expectStatus(204)
                .expectEmptyBody()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });

            mockManager.assert.sentEmail({to: 'test@test.com'});
        });

        it('can do validateMembersEmailUpdate', async function () {
            const magicLink = await membersService.api.getMagicLink('test@test.com');
            const magicLinkUrl = new URL(magicLink);
            const token = magicLinkUrl.searchParams.get('token');

            await agent
                .get(`settings/members/email/?token=${token}&action=supportAddressUpdate`)
                .expectStatus(302)
                .expectEmptyBody()
                .matchHeaderSnapshot();

            // Assert that the setting is changed as a side effect
            // NOTE: cannot use read here :/
            await agent.get('settings/')
                .expect(({body}) => {
                    const fromAddress = body.settings.find((setting) => {
                        return setting.key === 'members_support_address';
                    });
                    assert.equal(fromAddress.value, 'test@test.com');
                });
        });
    });
});
