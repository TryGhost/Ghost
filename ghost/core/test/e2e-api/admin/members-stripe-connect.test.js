const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {stringMatching} = matchers;

describe('Members Stripe Connect API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    it('can do auth', async function () {
        await agent
            .get(`members/stripe_connect`)
            .expectStatus(302)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                location: stringMatching(/^https:\/\/connect\.stripe\.com\/oauth\/authorize\?response_type=code&scope=read_write&client_id=/),
                'set-cookie': [
                    stringMatching(/^ghost-admin-api-session=/)
                ]
            });
    });
});
