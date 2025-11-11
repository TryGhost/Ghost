// Decided to have this test separately from the other email preview tests since the rate limiter would interfere with the other tests

const {agentProvider, fixtureManager, mockManager, configUtils, resetRateLimits, dbUtils} = require('../../utils/e2e-framework');
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

    beforeEach(async function () {
        mockManager.mockMailgun();
        // Reset both the brute table and rate limiter instances between tests
        await dbUtils.truncate('brute');
        await resetRateLimits();
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

    it('enforces limit globally across all IP addresses', async function () {
        const testEmailSpamBlock = configUtils.config.get('spam').email_preview_block;

        // Send freeRetries + 1 requests from "different IPs" using X-Forwarded-For header
        // Each request uses a different IP address to simulate an attacker rotating IPs
        for (let i = 0; i < testEmailSpamBlock.freeRetries + 1; i += 1) {
            await agent
                .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
                .header('X-Forwarded-For', `192.168.1.${i}`)
                .body({
                    emails: ['test@ghost.org']
                })
                .expectStatus(204); // All these should succeed (11 requests total)
        }

        // The next request from yet another different IP should be blocked
        // because the global limit has been reached (when ignoreIP: true)
        await agent
            .post(`email_previews/posts/${fixtureManager.get('posts', 0).id}/`)
            .header('X-Forwarded-For', '10.0.0.1')
            .body({
                emails: ['test@ghost.org']
            })
            .expectStatus(429);

        await allSettled();
    });
});
