const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyErrorId} = matchers;

describe('Authentication API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    describe('generateResetToken', function () {
        it('Cannot generate reset token without required info', async function () {
            await agent
                .post('authentication/password_reset')
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });
    });
});
