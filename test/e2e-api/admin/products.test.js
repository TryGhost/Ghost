const should = require('should');

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');

describe('Tiers API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsDisabled('multipleProducts');
        const stripeService = require('../../../core/server/services/stripe');
        stripeService.api._configured = true;
    });

    afterEach(function () {
        mockManager.restore();
        const stripeService = require('../../../core/server/services/stripe');
        stripeService.api._configured = false;
    });

    it('Errors when price is non-integer', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: {
                amount: 99.99
            }
        };

        await agent
            .post('/products/')
            .body({products: [tier]})
            .expectStatus(422);
    });

    it('Errors when price is negative', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: {
                amount: -100
            }
        };

        await agent
            .post('/products/')
            .body({products: [tier]})
            .expectStatus(422);
    });

    it('Errors when price is too large', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: {
                amount: Number.MAX_SAFE_INTEGER
            }
        };

        await agent
            .post('/products/')
            .body({products: [tier]})
            .expectStatus(422);
    });
});
