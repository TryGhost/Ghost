const assert = require('assert');
const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {stringMatching, anyEtag, anyObjectId, anyISODateTime} = matchers;

const CURRENT_SETTINGS_COUNT = 86;

const settingsMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const publicHashSettingMatcher = {
    id: anyObjectId,
    value: stringMatching(/[a-z0-9]{30}/),
    created_at: anyISODateTime,
    updated_at: anyISODateTime
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

    it('Can read a setting', async function () {
        await agent.get('settings/codeinjection_head/')
            .expectStatus(200)
            .matchBodySnapshot({
                settings: [settingsMatcher]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

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
                key: 'slack',
                value: JSON.stringify([{
                    url: 'https://overrides.tld',
                    username: 'Overrides Username'
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
                key: 'lang',
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
                settings: matchSettingsArray(settingsToChange.length)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('can do updateMembersEmail', async function () {
        await agent
            .post('settings/members/email/')
            .body({
                email: 'test@test.com',
                type: 'fromAddressUpdate'
            })
            .expectStatus(200)
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

        // @TODO Fixing https://github.com/TryGhost/Team/issues/584 should result in this test changing
        await agent
            .get(`settings/members/email/?token=${token}&action=fromAddressUpdate`)
            .expectStatus(302)
            .expectEmptyBody()
            .matchHeaderSnapshot();

        // Assert that the setting is changed as a side effect
        // NOTE: cannot use read here :/
        await agent.get('settings/')
            .expect(({body}) => {
                const fromAddress = body.settings.find((setting) => {
                    return setting.key === 'members_from_address';
                });
                assert.equal(fromAddress.value, 'test@test.com');
            });
    });

    it('can do disconnectStripeConnectIntegration', async function () {
        await agent
            .delete('/settings/stripe/connect/')
            .expectStatus(200)
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
});
