// Decided to have this test separately from the other email preview tests since the rate limiter would interfere with the other tests

const {agentProvider, fixtureManager, mockManager, configUtils} = require('../../utils/e2e-framework');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');

async function allSettled() {
    await DomainEvents.allSettled();
}

describe('Rate limiter', function () {
    let agent;

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
    });

    beforeEach(function () {
        mockManager.mockMailgun();
    });

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'newsletters', 'posts');
        await agent.loginAsOwner();
    });
    
    it('is rate limited against spammmer requests', async function () {
        const testEmailSpamBlock = configUtils.config.get('spam').email_preview_block;
        const requests = [];
        for (let i = 0; i < testEmailSpamBlock.freeRetries + 1; i += 1) {
            const req = await agent
                .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .body({
                    emails: ['test@ghost.org']
                });
            requests.push(req);
        }
        await Promise.all(requests);

        await agent
            .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
            .body({
                emails: ['test@ghost.org']
            })
            .expectStatus(429);

        await allSettled();
    });
});
