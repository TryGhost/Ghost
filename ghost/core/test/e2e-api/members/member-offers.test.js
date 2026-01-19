const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert/strict');

let membersAgent;
let membersService;

async function getIdentityToken(email) {
    const member = await models.Member.findOne({email});

    return membersService.api.getMemberIdentityToken(member.get('transient_id'));
}

describe('Members API - Member Offers', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();

        membersAgent = agents.membersAgent;
        membersService = require('../../../core/server/services/members');

        await fixtureManager.init('members');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('POST /members/api/member/offers', function () {
        it('returns 401 when not authenticated', async function () {
            await membersAgent
                .post('/api/member/offers')
                .body({})
                .expectStatus(401);
        });

        it('returns 401 with invalid identity token', async function () {
            await membersAgent
                .post('/api/member/offers')
                .body({identity: 'invalid-token'})
                .expectStatus(401);
        });

        it('returns 400 with invalid redemption_type', async function () {
            const token = await getIdentityToken('paid@test.com');

            await membersAgent
                .post('/api/member/offers')
                .body({identity: token, redemption_type: 'invalid'})
                .expectStatus(400);
        });

        it('returns empty offers array for free member', async function () {
            const token = await getIdentityToken('member1@test.com');

            const {body} = await membersAgent
                .post('/api/member/offers')
                .body({identity: token})
                .expectStatus(200);

            assert.deepEqual(body, {offers: []});
        });

        it('returns empty offers array when no retention offers exist', async function () {
            const token = await getIdentityToken('paid@test.com');

            const {body} = await membersAgent
                .post('/api/member/offers')
                .body({identity: token})
                .expectStatus(200);

            assert.deepEqual(body, {offers: []});
        });

        it('returns retention offers for paid member when available', async function () {
            // Get the paid member's subscription tier and cadence
            const member = await models.Member.findOne({email: 'paid@test.com'}, {
                withRelated: [
                    'stripeSubscriptions',
                    'stripeSubscriptions.stripePrice',
                    'stripeSubscriptions.stripePrice.stripeProduct',
                    'stripeSubscriptions.stripePrice.stripeProduct.product'
                ]
            });

            const subscription = member.related('stripeSubscriptions').models[0];
            const stripePrice = subscription.related('stripePrice');
            const stripeProduct = stripePrice.related('stripeProduct');
            const product = stripeProduct.related('product');

            const tierId = product.id;
            const cadence = stripePrice.get('interval');

            // Create a retention offer for this tier and cadence
            const offer = await models.Offer.add({
                name: 'Test Retention Offer',
                code: 'test-retention',
                portal_title: '20% off for 3 months',
                portal_description: 'Stay with us!',
                discount_type: 'percent',
                discount_amount: 20,
                duration: 'repeating',
                duration_in_months: 3,
                interval: cadence,
                product_id: tierId,
                currency: null,
                active: true,
                redemption_type: 'retention'
            });

            try {
                const token = await getIdentityToken('paid@test.com');

                const {body} = await membersAgent
                    .post('/api/member/offers')
                    .body({identity: token})
                    .expectStatus(200);

                assert.equal(body.offers.length, 1);
                assert.equal(body.offers[0].id, offer.id);
                assert.equal(body.offers[0].name, 'Test Retention Offer');
                assert.equal(body.offers[0].code, 'test-retention');
                assert.equal(body.offers[0].display_title, '20% off for 3 months');
                assert.equal(body.offers[0].display_description, 'Stay with us!');
                assert.equal(body.offers[0].type, 'percent');
                assert.equal(body.offers[0].amount, 20);
                assert.equal(body.offers[0].duration, 'repeating');
                assert.equal(body.offers[0].duration_in_months, 3);
                assert.equal(body.offers[0].cadence, cadence);
                assert.equal(body.offers[0].redemption_type, 'retention');
            } finally {
                // Clean up
                await models.Offer.destroy({id: offer.id});
            }
        });

        it('returns empty offers if subscription already has an offer applied', async function () {
            // Get the paid member's subscription
            const member = await models.Member.findOne({email: 'paid@test.com'}, {
                withRelated: [
                    'stripeSubscriptions',
                    'stripeSubscriptions.stripePrice',
                    'stripeSubscriptions.stripePrice.stripeProduct',
                    'stripeSubscriptions.stripePrice.stripeProduct.product'
                ]
            });

            const subscription = member.related('stripeSubscriptions').models[0];
            const stripePrice = subscription.related('stripePrice');
            const stripeProduct = stripePrice.related('stripeProduct');
            const product = stripeProduct.related('product');

            const tierId = product.id;
            const cadence = stripePrice.get('interval');

            // Create a retention offer
            const offer = await models.Offer.add({
                name: 'Test Retention Offer 2',
                code: 'test-retention-2',
                portal_title: '20% off',
                portal_description: 'Stay with us!',
                discount_type: 'percent',
                discount_amount: 20,
                duration: 'once',
                interval: cadence,
                product_id: tierId,
                currency: null,
                active: true,
                redemption_type: 'retention'
            });

            // Create a signup offer and apply it to the subscription
            const signupOffer = await models.Offer.add({
                name: 'Signup Offer',
                code: 'signup-offer',
                portal_title: '10% off',
                portal_description: 'Welcome!',
                discount_type: 'percent',
                discount_amount: 10,
                duration: 'once',
                interval: cadence,
                product_id: tierId,
                currency: null,
                active: true,
                redemption_type: 'signup'
            });

            // Set the offer_id on the subscription
            await subscription.save({offer_id: signupOffer.id}, {patch: true});

            try {
                const token = await getIdentityToken('paid@test.com');

                const {body} = await membersAgent
                    .post('/api/member/offers')
                    .body({identity: token})
                    .expectStatus(200);

                // Should not return retention offers if subscription already has an offer
                assert.deepEqual(body, {offers: []});
            } finally {
                // Clean up
                await subscription.save({offer_id: null}, {patch: true});
                await models.Offer.destroy({id: offer.id});
                await models.Offer.destroy({id: signupOffer.id});
            }
        });
    });
});
