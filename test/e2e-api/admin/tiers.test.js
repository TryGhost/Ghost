const {
    agentProvider,
    fixtureManager,
    mockManager,
    matchers
} = require('../../utils/e2e-framework');

describe('Tiers API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleProducts');
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can browse Tiers', async function () {
        await agent
            .get('/tiers/')
            .expectStatus(200)
            .matchBodySnapshot({
                tiers: Array(2).fill({
                    id: matchers.anyObjectId,
                    created_at: matchers.anyDate,
                    updated_at: matchers.anyDate
                })
            });
    });

    it('Errors when price is non-integer', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: {
                amount: 99.99
            }
        };

        await agent
            .post('/tiers/')
            .body({tiers: [tier]})
            .expectStatus(422)
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyUuid
                }]
            });
    });

    it('Errors when price is negative', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: {
                amount: -100
            }
        };

        await agent
            .post('/tiers/')
            .body({tiers: [tier]})
            .expectStatus(422)
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyUuid
                }]
            });
    });

    it('Errors when price is too large', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: {
                amount: Number.MAX_SAFE_INTEGER
            }
        };

        await agent
            .post('/tiers/')
            .body({tiers: [tier]})
            .expectStatus(422)
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyUuid
                }]
            });
    });
});
