const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const assert = require('assert/strict');

let membersAgent;
let membersService;

async function getIdentityToken(email) {
    const member = await models.Member.findOne({email});

    return membersService.api.getMemberIdentityToken(member.get('transient_id'));
}

async function getMemberSubscription(email) {
    const member = await models.Member.findOne({email}, {
        withRelated: [
            'stripeSubscriptions',
            'stripeSubscriptions.stripePrice',
            'stripeSubscriptions.stripePrice.stripeProduct',
            'stripeSubscriptions.stripePrice.stripeProduct.product'
        ]
    });

    return {
        member,
        subscription: member.related('stripeSubscriptions').models[0]
    };
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

    describe('POST /members/api/subscriptions/:id/apply-offer', function () {
        beforeEach(function () {
            mockManager.mockStripe();
        });

        it('returns 401 when not authenticated', async function () {
            await membersAgent
                .post('/api/subscriptions/sub_123/apply-offer')
                .body({offer_id: 'offer_123'})
                .expectStatus(401);
        });

        it('returns 401 with invalid identity token', async function () {
            await membersAgent
                .post('/api/subscriptions/sub_123/apply-offer')
                .body({identity: 'invalid-token', offer_id: 'offer_123'})
                .expectStatus(401);
        });

        it('returns 400 when offer_id is missing', async function () {
            const token = await getIdentityToken('paid@test.com');

            await membersAgent
                .post('/api/subscriptions/sub_123/apply-offer')
                .body({identity: token})
                .expectStatus(400);
        });

        it('returns 404 when subscription not found', async function () {
            const token = await getIdentityToken('paid@test.com');

            await membersAgent
                .post('/api/subscriptions/sub_nonexistent/apply-offer')
                .body({identity: token, offer_id: 'offer_123'})
                .expectStatus(404);
        });

        it('returns 404 when offer not found', async function () {
            const {subscription} = await getMemberSubscription('paid@test.com');
            const stripeSubscriptionId = subscription.get('subscription_id');
            const token = await getIdentityToken('paid@test.com');

            await membersAgent
                .post(`/api/subscriptions/${stripeSubscriptionId}/apply-offer`)
                .body({identity: token, offer_id: 'nonexistent_offer_id'})
                .expectStatus(404);
        });

        it('returns 400 when subscription already has an offer', async function () {
            const {subscription} = await getMemberSubscription('paid@test.com');
            const stripePrice = subscription.related('stripePrice');
            const stripeProduct = stripePrice.related('stripeProduct');
            const product = stripeProduct.related('product');

            const stripeSubscriptionId = subscription.get('subscription_id');
            const tierId = product.id;
            const cadence = stripePrice.get('interval');

            // Create a retention offer
            const retentionOffer = await models.Offer.add({
                name: 'Test Retention',
                code: 'test-retention-apply',
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

            // Create another offer and apply it to subscription
            const existingOffer = await models.Offer.add({
                name: 'Existing Offer',
                code: 'existing-offer',
                portal_title: '5% off',
                portal_description: 'Already applied',
                discount_type: 'percent',
                discount_amount: 5,
                duration: 'once',
                interval: cadence,
                product_id: tierId,
                currency: null,
                active: true,
                redemption_type: 'signup'
            });

            await subscription.save({offer_id: existingOffer.id}, {patch: true});

            try {
                const token = await getIdentityToken('paid@test.com');

                await membersAgent
                    .post(`/api/subscriptions/${stripeSubscriptionId}/apply-offer`)
                    .body({identity: token, offer_id: retentionOffer.id})
                    .expectStatus(400);
            } finally {
                await subscription.save({offer_id: null}, {patch: true});
                await models.Offer.destroy({id: retentionOffer.id});
                await models.Offer.destroy({id: existingOffer.id});
            }
        });

        it('returns 400 when offer tier does not match subscription', async function () {
            const {subscription} = await getMemberSubscription('paid@test.com');
            const stripePrice = subscription.related('stripePrice');

            const stripeSubscriptionId = subscription.get('subscription_id');
            const cadence = stripePrice.get('interval');

            // Create a different tier for testing
            const differentTier = await models.Product.add({
                name: 'Different Tier',
                slug: 'different-tier-test',
                type: 'paid',
                currency: 'usd',
                monthly_price: 1000,
                yearly_price: 10000,
                visibility: 'public'
            });

            // Create a retention offer for a different tier
            const retentionOffer = await models.Offer.add({
                name: 'Wrong Tier Retention',
                code: 'wrong-tier-retention',
                portal_title: '20% off',
                portal_description: 'Stay with us!',
                discount_type: 'percent',
                discount_amount: 20,
                duration: 'once',
                interval: cadence,
                product_id: differentTier.id,
                currency: null,
                active: true,
                redemption_type: 'retention'
            });

            try {
                const token = await getIdentityToken('paid@test.com');

                await membersAgent
                    .post(`/api/subscriptions/${stripeSubscriptionId}/apply-offer`)
                    .body({identity: token, offer_id: retentionOffer.id})
                    .expectStatus(400);
            } finally {
                await models.Offer.destroy({id: retentionOffer.id});
                await models.Product.destroy({id: differentTier.id});
            }
        });

        it('returns 400 when offer cadence does not match subscription', async function () {
            const {subscription} = await getMemberSubscription('paid@test.com');
            const stripePrice = subscription.related('stripePrice');
            const stripeProduct = stripePrice.related('stripeProduct');
            const product = stripeProduct.related('product');

            const stripeSubscriptionId = subscription.get('subscription_id');
            const tierId = product.id;
            const cadence = stripePrice.get('interval');
            // Use opposite cadence
            const wrongCadence = cadence === 'month' ? 'year' : 'month';

            // Create a retention offer with wrong cadence
            const retentionOffer = await models.Offer.add({
                name: 'Wrong Cadence Retention',
                code: 'wrong-cadence-retention',
                portal_title: '20% off',
                portal_description: 'Stay with us!',
                discount_type: 'percent',
                discount_amount: 20,
                duration: 'once',
                interval: wrongCadence,
                product_id: tierId,
                currency: null,
                active: true,
                redemption_type: 'retention'
            });

            try {
                const token = await getIdentityToken('paid@test.com');

                await membersAgent
                    .post(`/api/subscriptions/${stripeSubscriptionId}/apply-offer`)
                    .body({identity: token, offer_id: retentionOffer.id})
                    .expectStatus(400);
            } finally {
                await models.Offer.destroy({id: retentionOffer.id});
            }
        });

        it('returns 400 when offer is inactive', async function () {
            const {subscription} = await getMemberSubscription('paid@test.com');
            const stripePrice = subscription.related('stripePrice');
            const stripeProduct = stripePrice.related('stripeProduct');
            const product = stripeProduct.related('product');

            const stripeSubscriptionId = subscription.get('subscription_id');
            const tierId = product.id;
            const cadence = stripePrice.get('interval');

            // Create an inactive retention offer
            const retentionOffer = await models.Offer.add({
                name: 'Inactive Retention',
                code: 'inactive-retention',
                portal_title: '20% off',
                portal_description: 'Stay with us!',
                discount_type: 'percent',
                discount_amount: 20,
                duration: 'once',
                interval: cadence,
                product_id: tierId,
                currency: null,
                active: false,
                redemption_type: 'retention'
            });

            try {
                const token = await getIdentityToken('paid@test.com');

                await membersAgent
                    .post(`/api/subscriptions/${stripeSubscriptionId}/apply-offer`)
                    .body({identity: token, offer_id: retentionOffer.id})
                    .expectStatus(400);
            } finally {
                await models.Offer.destroy({id: retentionOffer.id});
            }
        });

        it('returns 400 when offer is a signup offer', async function () {
            const {subscription} = await getMemberSubscription('paid@test.com');
            const stripePrice = subscription.related('stripePrice');
            const stripeProduct = stripePrice.related('stripeProduct');
            const product = stripeProduct.related('product');

            const stripeSubscriptionId = subscription.get('subscription_id');
            const tierId = product.id;
            const cadence = stripePrice.get('interval');

            // Create a signup offer (not allowed for existing subscriptions)
            const signupOffer = await models.Offer.add({
                name: 'Signup Only Offer',
                code: 'signup-only',
                portal_title: '20% off',
                portal_description: 'New members only!',
                discount_type: 'percent',
                discount_amount: 20,
                duration: 'once',
                interval: cadence,
                product_id: tierId,
                currency: null,
                active: true,
                redemption_type: 'signup'
            });

            try {
                const token = await getIdentityToken('paid@test.com');

                await membersAgent
                    .post(`/api/subscriptions/${stripeSubscriptionId}/apply-offer`)
                    .body({identity: token, offer_id: signupOffer.id})
                    .expectStatus(400);
            } finally {
                await models.Offer.destroy({id: signupOffer.id});
            }
        });

        it('returns 400 when subscription is canceled', async function () {
            const {subscription} = await getMemberSubscription('paid@test.com');
            const stripePrice = subscription.related('stripePrice');
            const stripeProduct = stripePrice.related('stripeProduct');
            const product = stripeProduct.related('product');

            const stripeSubscriptionId = subscription.get('subscription_id');
            const tierId = product.id;
            const cadence = stripePrice.get('interval');

            // Temporarily set subscription to canceled status
            const originalStatus = subscription.get('status');
            await subscription.save({status: 'canceled'}, {patch: true});

            // Create a retention offer
            const retentionOffer = await models.Offer.add({
                name: 'Test Retention Canceled',
                code: 'test-retention-canceled',
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

            try {
                const token = await getIdentityToken('paid@test.com');

                await membersAgent
                    .post(`/api/subscriptions/${stripeSubscriptionId}/apply-offer`)
                    .body({identity: token, offer_id: retentionOffer.id})
                    .expectStatus(400);
            } finally {
                await subscription.save({status: originalStatus}, {patch: true});
                await models.Offer.destroy({id: retentionOffer.id});
            }
        });

        it('successfully applies retention offer to subscription', async function () {
            const {subscription} = await getMemberSubscription('paid@test.com');
            const stripePrice = subscription.related('stripePrice');
            const stripeProduct = stripePrice.related('stripeProduct');
            const product = stripeProduct.related('product');

            const stripeSubscriptionId = subscription.get('subscription_id');
            const tierId = product.id;
            const cadence = stripePrice.get('interval');

            // Add a mock coupon to the stripe mocker so the subscription update works
            const stripeCouponId = 'coupon_test_retention';
            mockManager.stripeMocker.coupons.push({
                id: stripeCouponId,
                object: 'coupon',
                percent_off: 20,
                duration: 'repeating',
                duration_in_months: 3
            });

            // Create a proper mock price object
            const mockPrice = {
                id: stripePrice.get('stripe_price_id'),
                product: stripeProduct.get('stripe_product_id'),
                active: true,
                nickname: cadence,
                unit_amount: stripePrice.get('amount'),
                currency: stripePrice.get('currency'),
                type: 'recurring',
                recurring: {
                    interval: cadence
                }
            };
            mockManager.stripeMocker.prices.push(mockPrice);

            // Add the subscription to the stripe mocker so it can be updated
            mockManager.stripeMocker.subscriptions.push({
                id: stripeSubscriptionId,
                object: 'subscription',
                status: 'active',
                customer: subscription.get('customer_id'),
                cancel_at_period_end: false,
                current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                start_date: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
                items: {
                    data: [{
                        id: 'si_test',
                        price: mockPrice
                    }]
                }
            });

            // Create a retention offer with stripe_coupon_id to skip Stripe API call
            const retentionOffer = await models.Offer.add({
                name: 'Success Retention Offer',
                code: 'success-retention',
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
                redemption_type: 'retention',
                stripe_coupon_id: stripeCouponId
            });

            try {
                const token = await getIdentityToken('paid@test.com');

                await membersAgent
                    .post(`/api/subscriptions/${stripeSubscriptionId}/apply-offer`)
                    .body({identity: token, offer_id: retentionOffer.id})
                    .expectStatus(204);

                // Verify the subscription was updated with the offer
                await subscription.refresh();
                assert.equal(subscription.get('offer_id'), retentionOffer.id);

                // Verify offer redemption was recorded
                const redemption = await models.OfferRedemption.findOne({
                    offer_id: retentionOffer.id,
                    subscription_id: subscription.id
                });
                assert.ok(redemption, 'Offer redemption should be recorded');
            } finally {
                // Clean up - find the redemption by its criteria and destroy by id
                const redemption = await models.OfferRedemption.findOne({
                    offer_id: retentionOffer.id,
                    subscription_id: subscription.id
                });
                if (redemption) {
                    await models.OfferRedemption.destroy({id: redemption.id});
                }
                await subscription.save({offer_id: null}, {patch: true});
                await models.Offer.destroy({id: retentionOffer.id});
            }
        });
    });
});
