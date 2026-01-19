const assert = require('assert/strict');
const sinon = require('sinon');
const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const DomainEvents = require('@tryghost/domain-events');
const StripeMocker = require('../../../utils/stripe-mocker');
const testUtils = require('../../../utils');

describe('MemberRepository Integration', function () {
    let membersService;
    let stripeMocker;

    before(async function () {
        // Boot Ghost
        await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('products');

        // Get services after Ghost has booted
        membersService = require('../../../../core/server/services/members');
        stripeMocker = new StripeMocker();
    });

    beforeEach(function () {
        stripeMocker.reset();
        stripeMocker.stub();
    });

    afterEach(async function () {
        stripeMocker.remove();
        await DomainEvents.allSettled();
        sinon.restore();
    });

    describe('linkSubscription', function () {
        it('creates an offer from a Stripe coupon', async function () {
            // Keep coupon ID short - auto-generated offer name includes it and has 40 char limit
            const stripeCouponId = `cpn_${Date.now().toString(36)}`;

            // Verify no offer exists yet
            const existingOffer = await models.Offer.findOne({stripe_coupon_id: stripeCouponId});
            assert.equal(existingOffer, null, 'No offer should exist before test');

            // Get a paid tier to use
            const tier = await models.Product.findOne({type: 'paid'});
            assert.ok(tier, 'A paid tier should exist');

            // Create a Stripe customer
            const customer = stripeMocker.createCustomer({
                email: `integration-test-${Date.now()}@example.com`,
                name: 'Integration Test User'
            });

            // Get a price for the tier
            const price = await stripeMocker.getPriceForTier(tier.get('slug'), 'month');

            // Create a subscription with a coupon discount
            const subscription = await stripeMocker.createSubscription({
                customer,
                price,
                discount: {
                    id: 'di_test',
                    coupon: {
                        id: stripeCouponId,
                        object: 'coupon',
                        percent_off: 25,
                        duration: 'forever',
                        name: '25% off' // Keep name short - auto-generated offer name includes coupon ID
                    }
                }
            }, {sendWebhook: false}); // Don't send webhook, we'll call linkSubscription directly

            // Create a member using the service (handles all defaults)
            const member = await membersService.api.members.create({
                email: customer.email,
                name: customer.name
            }, {});

            // Link stripe customer to member
            await models.MemberStripeCustomer.add({
                member_id: member.id,
                customer_id: customer.id
            });

            // Get the repository
            const memberRepository = membersService.api.members;

            // Call linkSubscription directly - this is what we're testing
            await memberRepository.linkSubscription({
                id: member.id,
                subscription: {
                    id: subscription.id,
                    customer: customer.id,
                    status: subscription.status,
                    items: subscription.items,
                    discount: subscription.discount,
                    current_period_end: subscription.current_period_end,
                    start_date: subscription.start_date,
                    cancel_at_period_end: false
                }
            }, {
                transacting: null,
                context: {}
            });

            await DomainEvents.allSettled();

            // Verify: offer was created from the coupon
            const createdOffer = await models.Offer.findOne({stripe_coupon_id: stripeCouponId});
            assert.ok(createdOffer, 'An offer should have been created from the Stripe coupon');
            assert.equal(createdOffer.get('discount_amount'), 25, 'Offer discount should be 25%');
            assert.equal(createdOffer.get('discount_type'), 'percent', 'Offer should be percent type');
            assert.equal(createdOffer.get('duration'), 'forever', 'Offer duration should be forever');
            // Verify tier and cadence are correct (what the unit test checked via args)
            assert.equal(createdOffer.get('product_id'), tier.id, 'Offer should be for the correct tier');
            assert.equal(createdOffer.get('interval'), 'month', 'Offer should be for monthly cadence');

            // Verify: subscription was created with the offer linked
            const dbSubscription = await models.StripeCustomerSubscription.findOne({
                subscription_id: subscription.id
            });
            assert.ok(dbSubscription, 'Subscription should exist in database');
            assert.equal(dbSubscription.get('offer_id'), createdOffer.id, 'Subscription should be linked to the created offer');
        });

        it('links existing offer when coupon already has one', async function () {
            const stripeCouponId = `coupon_existing_${Date.now()}`;

            // Get a paid tier
            const tier = await models.Product.findOne({type: 'paid'});

            // Create an offer first that's linked to this coupon using the offers service
            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: tier.id,
                stripe_coupon_id: stripeCouponId,
                name: 'Existing Offer',
                code: `existing-${Date.now()}`,
                discount_type: 'percent',
                discount_amount: 30,
                duration: 'once',
                interval: 'month',
                active: true
            });
            const existingOffer = await models.Offer.add(offerData, {context: {internal: true}});

            // Create Stripe customer and subscription
            const customer = stripeMocker.createCustomer({
                email: `existing-offer-test-${Date.now()}@example.com`
            });
            const price = await stripeMocker.getPriceForTier(tier.get('slug'), 'month');
            const subscription = await stripeMocker.createSubscription({
                customer,
                price,
                discount: {
                    id: 'di_existing',
                    coupon: {
                        id: stripeCouponId,
                        object: 'coupon',
                        percent_off: 30,
                        duration: 'once'
                    }
                }
            }, {sendWebhook: false});

            // Create member using the service
            const member = await membersService.api.members.create({
                email: customer.email
            }, {});
            await models.MemberStripeCustomer.add({
                member_id: member.id,
                customer_id: customer.id
            });

            // Call linkSubscription
            const memberRepository = membersService.api.members;
            await memberRepository.linkSubscription({
                id: member.id,
                subscription: {
                    id: subscription.id,
                    customer: customer.id,
                    status: subscription.status,
                    items: subscription.items,
                    discount: subscription.discount,
                    current_period_end: subscription.current_period_end,
                    start_date: subscription.start_date,
                    cancel_at_period_end: false
                }
            }, {
                transacting: null,
                context: {}
            });

            await DomainEvents.allSettled();

            // Verify: no new offer was created
            const offers = await models.Offer.findAll({filter: `stripe_coupon_id:${stripeCouponId}`});
            assert.equal(offers.length, 1, 'Should still only have one offer');

            // Verify: subscription uses the existing offer
            const dbSubscription = await models.StripeCustomerSubscription.findOne({
                subscription_id: subscription.id
            });
            assert.equal(dbSubscription.get('offer_id'), existingOffer.id, 'Subscription should use the existing offer');
        });

        it('creates subscription without offer when no coupon present', async function () {
            // Get a paid tier
            const tier = await models.Product.findOne({type: 'paid'});

            // Create Stripe customer and subscription without discount
            const customer = stripeMocker.createCustomer({
                email: `no-coupon-test-${Date.now()}@example.com`
            });
            const price = await stripeMocker.getPriceForTier(tier.get('slug'), 'month');
            const subscription = await stripeMocker.createSubscription({
                customer,
                price
                // No discount
            }, {sendWebhook: false});

            // Create member using the service
            const member = await membersService.api.members.create({
                email: customer.email
            }, {});
            await models.MemberStripeCustomer.add({
                member_id: member.id,
                customer_id: customer.id
            });

            // Call linkSubscription
            const memberRepository = membersService.api.members;
            await memberRepository.linkSubscription({
                id: member.id,
                subscription: {
                    id: subscription.id,
                    customer: customer.id,
                    status: subscription.status,
                    items: subscription.items,
                    current_period_end: subscription.current_period_end,
                    start_date: subscription.start_date,
                    cancel_at_period_end: false
                }
            }, {
                transacting: null,
                context: {}
            });

            await DomainEvents.allSettled();

            // Verify: subscription was created without an offer
            const dbSubscription = await models.StripeCustomerSubscription.findOne({
                subscription_id: subscription.id
            });
            assert.ok(dbSubscription, 'Subscription should exist');
            assert.equal(dbSubscription.get('offer_id'), null, 'Subscription should not have an offer');
        });
    });
});