const should = require('should');
const sinon = require('sinon');

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
        mockManager.mockStripe();

        sinon
            .stub(stripeService.api, 'createProduct')
            .resolves({
                id: 'prod_LFPlH9BDDwXcZ1'
            });

        sinon
            .stub(stripeService.api, 'createPrice')
            .resolves({
                id: 'price_1KYpK92eZvKYlo2C86IrYSPM',
                currency: 'usd',
                nickname: null,
                unit_amount: 299
            });
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

    it('Create a new tier with benefits', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: {
                amount: 10
            },
            benefits: [{
                name: 'This is a benefit'
            }]
        };

        await agent
            .post('/products/')
            .body({products: [tier]})
            .expectStatus(201);
    });

    it('Errors when a benefit has an empty name', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: {
                amount: 10
            },
            benefits: [{
                name: ''
            }]
        };

        await agent
            .post('/products/')
            .body({products: [tier]})
            .expectStatus(422);
    });

    it('Errors when a product is edited with a benefit that has an empty name', async function () {
        const tier = {
            benefits: [{
                name: ''
            }]
        };

        await agent
            .put('/products/' + fixtureManager.get('products', 0).id)
            .body({products: [tier]})
            .expectStatus(422);
    });
});
