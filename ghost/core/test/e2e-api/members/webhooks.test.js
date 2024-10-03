const crypto = require('crypto');
const assert = require('assert/strict');
const nock = require('nock');
const should = require('should');
const stripe = require('stripe');
const {Product} = require('../../../core/server/models/product');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const urlService = require('../../../core/server/services/url');
const urlUtils = require('../../../core/shared/url-utils');
const DomainEvents = require('@tryghost/domain-events');
const {anyContentVersion, anyEtag, anyObjectId, anyUuid, anyISODateTime, anyString, anyArray, anyObject} = matchers;

let membersAgent;
let adminAgent;

function createStripeID(prefix) {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

async function getPaidProduct() {
    return await Product.findOne({type: 'paid'});
}

async function getSubscription(subscriptionId) {
    // eslint-disable-next-line dot-notation
    return await models['StripeCustomerSubscription'].where('subscription_id', subscriptionId).fetch({require: true});
}
async function getMember(memberId) {
    // eslint-disable-next-line dot-notation
    return await models['Member'].where('id', memberId).fetch({require: true});
}

async function assertMemberEvents({eventType, memberId, asserts}) {
    const events = (await models[eventType].where('member_id', memberId).fetchAll()).toJSON();
    events.should.match(asserts);
    assert.equal(events.length, asserts.length, `Only ${asserts.length} ${eventType} should have been added.`);
}

async function assertSubscription(subscriptionId, asserts) {
    const subscription = await getSubscription(subscriptionId);

    // We use the native toJSON to prevent calling the overriden serialize method
    models.Base.Model.prototype.serialize.call(subscription).should.match(asserts);
}

describe('Members API', function () {
    // @todo: Test what happens when a complimentary subscription ends (should create comped -> free event)
    // @todo: Test what happens when a complimentary subscription starts a paid subscription

    // We create some shared stripe resources, so we don't have to have nocks in every test case
    const subscription = {};
    const customer = {};
    const paymentMethod = {};
    const setupIntent = {};
    const coupon = {};

    beforeEach(function () {
        nock('https://api.stripe.com')
            .persist()
            .get(/v1\/.*/)
            .reply((uri) => {
                const [match, resource, id] = uri.match(/\/?v1\/(\w+)\/?(\w+)/) || [null];

                if (!match) {
                    return [500];
                }

                if (resource === 'setup_intents') {
                    return [200, setupIntent];
                }

                if (resource === 'customers') {
                    if (customer.id !== id) {
                        return [404];
                    }
                    return [200, customer];
                }

                if (resource === 'subscriptions') {
                    if (subscription.id !== id) {
                        return [404];
                    }
                    return [200, subscription];
                }

                if (resource === 'coupons') {
                    if (coupon.id !== id) {
                        return [404];
                    }
                    return [200, coupon];
                }
            });

        nock('https://api.stripe.com')
            .persist()
            .post(/v1\/.*/)
            .reply((uri) => {
                const [match, resource] = uri.match(/\/?v1\/(\w+)(?:\/?(\w+)){0,2}/) || [null];

                if (!match) {
                    return [500];
                }

                if (resource === 'payment_methods') {
                    return [200, paymentMethod];
                }

                if (resource === 'subscriptions') {
                    return [200, subscription];
                }

                if (resource === 'customers') {
                    return [200, customer];
                }

                if (resource === 'coupons') {
                    return [200, coupon];
                }

                return [500];
            });
    });

    afterEach(function () {
        mockManager.restore();
    });

    // Helper methods to update the customer and subscription
    function set(object, newValues) {
        for (const key of Object.keys(object)) {
            delete object[key];
        }
        Object.assign(object, newValues);
    }

    describe('/webhooks/stripe/', function () {
        before(async function () {
            const agents = await agentProvider.getAgentsForMembers();
            membersAgent = agents.membersAgent;
            adminAgent = agents.adminAgent;

            await fixtureManager.init('members');
            await adminAgent.loginAsOwner();
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('Responds with a 401 when the signature is invalid', async function () {
            await membersAgent.post('/webhooks/stripe/')
                .body({
                    fake: 'data'
                })
                .header('stripe-signature', 'dodgy')
                .expectStatus(401);
        });

        it('Responds with a 200 to unknown events with valid signature', async function () {
            const webhookPayload = JSON.stringify({
                type: 'unknown',
                data: {
                    id: 'id_123'
                }
            });
            const webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);
        });
    });

    describe('Handling the end of subscriptions', function () {
        before(async function () {
            const agents = await agentProvider.getAgentsForMembers();
            membersAgent = agents.membersAgent;
            adminAgent = agents.adminAgent;

            await fixtureManager.init('members');
            await adminAgent.loginAsOwner();
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        /**
         * Helper method to create an existing member based on a customer in stripe (= current customer)
         */
        async function createMemberFromStripe() {
            const initialMember = {
                name: customer.name,
                email: customer.email,
                subscribed: true,
                stripe_customer_id: customer.id
            };

            const {body} = await adminAgent
                .post(`/members/`)
                .body({members: [initialMember]})
                .expectStatus(201);
            assert.equal(body.members.length, 1, 'The member was not created');
            const member = body.members[0];
            return member;
        }

        let canceledPaidMember;

        it('Handles cancellation of paid subscriptions at the end of the billing cycle', async function () {
            const customer_id = createStripeID('cust');
            const subscription_id = createStripeID('sub');

            // Create a new subscription in Stripe
            set(subscription, {
                id: subscription_id,
                customer: customer_id,
                status: 'active',
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price: {
                            id: 'price_123',
                            product: 'product_123',
                            active: true,
                            nickname: 'Monthly',
                            currency: 'usd',
                            recurring: {
                                interval: 'month'
                            },
                            unit_amount: 500,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: Date.now() / 1000,
                current_period_end: Date.now() / 1000 + (60 * 60 * 24 * 31),
                cancel_at_period_end: false
            });

            // Create a new customer in Stripe
            set(customer, {
                id: customer_id,
                name: 'Cancel me at the end of the billing cycle',
                email: 'cancel-me-at-the-end-of-cycle@test.com',
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            // Make sure this customer has a corresponding member in the database
            // And all the subscriptions are setup correctly
            const initialMember = await createMemberFromStripe();
            assert.equal(initialMember.status, 'paid', 'The member initial status should be paid');
            assert.equal(initialMember.tiers.length, 1, 'The member should have one tier');
            should(initialMember.subscriptions).match([
                {
                    status: 'active'
                }
            ]);

            // Check whether MRR and status has been set
            await assertSubscription(initialMember.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'active',
                cancel_at_period_end: false,
                plan_amount: 500,
                plan_interval: 'month',
                plan_currency: 'usd',
                mrr: 500
            });

            // Set the subscription to cancel at the end of the period
            set(subscription, {
                ...subscription,
                canceled_at: Date.now() / 1000,
                cancel_at_period_end: true,
                metadata: {
                    cancellation_reason: 'I want to break free'
                }
            });

            // Send the webhook call to announce the cancelation
            const webhookPayload = JSON.stringify({
                type: 'customer.subscription.updated',
                data: {
                    object: subscription
                }
            });
            const webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);

            // Check that the subscription has been set to cancel and has saved the cancellation reason
            const {body: body2} = await adminAgent.get('/members/' + initialMember.id + '/');
            assert.equal(body2.members.length, 1, 'The member does not exist');
            const updatedMember = body2.members[0];
            should(updatedMember.subscriptions).match([
                {
                    status: 'active',
                    cancel_at_period_end: true,
                    cancellation_reason: 'I want to break free'
                }
            ]);

            // Check whether MRR and cancel_at_period_end has been set
            await assertSubscription(initialMember.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'active',
                cancel_at_period_end: true,
                plan_amount: 500,
                plan_interval: 'month',
                plan_currency: 'usd',
                mrr: 0
            });

            // Check that there is a canceled event
            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: updatedMember.id,
                asserts: [
                    {
                        type: 'created',
                        mrr_delta: 500
                    },
                    {
                        type: 'canceled',
                        mrr_delta: -500
                    }
                ]
            });

            // Check that the staff notifications has been sent
            await DomainEvents.allSettled();

            mockManager.assert.sentEmail({
                subject: /Paid subscription started: Cancel me at the end of the billing cycle/,
                to: 'jbloggs@example.com'
            });

            mockManager.assert.sentEmail({
                subject: /Cancellation: Cancel me at the end of the billing cycle/,
                to: 'jbloggs@example.com'
            });
        });

        it('Handles immediate cancellation of paid subscriptions', async function () {
            const customer_id = createStripeID('cust');
            const subscription_id = createStripeID('sub');

            // Create a new subscription in Stripe
            set(subscription, {
                id: subscription_id,
                customer: customer_id,
                status: 'active',
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price: {
                            id: 'price_123',
                            product: 'product_123',
                            active: true,
                            nickname: 'Monthly',
                            currency: 'usd',
                            recurring: {
                                interval: 'month'
                            },
                            unit_amount: 500,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: Date.now() / 1000,
                current_period_end: Date.now() / 1000 + (60 * 60 * 24 * 31),
                cancel_at_period_end: false
            });

            // Create a new customer in Stripe
            set(customer, {
                id: customer_id,
                name: 'Cancel me now',
                email: 'cancel-me-immediately@test.com',
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            // Make sure this customer has a corresponding member in the database
            // And all the subscriptions are setup correctly
            const initialMember = await createMemberFromStripe();
            assert.equal(initialMember.status, 'paid', 'The member initial status should be paid');
            assert.equal(initialMember.tiers.length, 1, 'The member should have one tier');
            should(initialMember.subscriptions).match([
                {
                    status: 'active'
                }
            ]);

            // Check whether MRR and status has been set
            await assertSubscription(initialMember.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'active',
                cancel_at_period_end: false,
                plan_amount: 500,
                plan_interval: 'month',
                plan_currency: 'usd',
                mrr: 500
            });

            // Cancel the previously created subscription in Stripe
            set(subscription, {
                ...subscription,
                status: 'canceled',
                canceled_at: Date.now() / 1000,
                cancellation_details: {
                    reason: 'payment_failed'
                }
            });

            // Send the webhook call to announce the cancelation
            const webhookPayload = JSON.stringify({
                type: 'customer.subscription.deleted',
                data: {
                    object: subscription
                }
            });
            const webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);

            // Check status has been updated to 'free' after cancelling
            const {body: body2} = await adminAgent.get('/members/' + initialMember.id + '/');
            assert.equal(body2.members.length, 1, 'The member does not exist');
            const updatedMember = body2.members[0];
            assert.equal(updatedMember.status, 'free');
            assert.equal(updatedMember.tiers.length, 0, 'The member should have no products');
            should(updatedMember.subscriptions).match([
                {
                    status: 'canceled',
                    cancellation_reason: 'Payment failed'
                }
            ]);

            // Check whether MRR and status has been set
            await assertSubscription(initialMember.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'canceled',
                cancel_at_period_end: false,
                plan_amount: 500,
                plan_interval: 'month',
                plan_currency: 'usd',
                mrr: 0
            });

            // Check the status events for this newly created member (should be NULL -> paid only)
            await assertMemberEvents({
                eventType: 'MemberStatusEvent',
                memberId: updatedMember.id,
                asserts: [
                    {
                        from_status: null,
                        to_status: 'free'
                    },
                    {
                        from_status: 'free',
                        to_status: 'paid'
                    },
                    {
                        from_status: 'paid',
                        to_status: 'free'
                    }
                ]
            });

            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: updatedMember.id,
                asserts: [
                    {
                        type: 'created',
                        mrr_delta: 500
                    },
                    {
                        type: 'expired',
                        mrr_delta: -500
                    }
                ]
            });

            // Check that the staff notifications has been sent
            await DomainEvents.allSettled();

            mockManager.assert.sentEmail({
                subject: /Paid subscription started: Cancel me now/,
                to: 'jbloggs@example.com'
            });

            mockManager.assert.sentEmail({
                subject: /Cancellation: Cancel me now/,
                to: 'jbloggs@example.com'
            });

            canceledPaidMember = updatedMember;
        });

        it('Can create a comlimentary subscription after canceling a paid subscription', async function () {
            const product = await getPaidProduct();

            const compedPayload = {
                id: canceledPaidMember.id,
                tiers: [
                    {
                        id: product.id
                    }
                ]
            };

            const {body} = await adminAgent
                .put(`/members/${canceledPaidMember.id}/`)
                .body({members: [compedPayload]})
                .expectStatus(200);

            const updatedMember = body.members[0];
            assert.equal(updatedMember.status, 'comped', 'A comped member should have the comped status');
            assert.equal(updatedMember.tiers.length, 1, 'The member should have one tier');
            should(updatedMember.subscriptions).match([
                {
                    status: 'canceled'
                },
                {
                    status: 'active'
                }
            ]);
            assert.equal(updatedMember.subscriptions.length, 2, 'The member should have two subscriptions');

            // Check the status events for this newly created member (should be NULL -> paid only)
            await assertMemberEvents({
                eventType: 'MemberStatusEvent',
                memberId: updatedMember.id,
                asserts: [
                    {
                        from_status: null,
                        to_status: 'free'
                    },
                    {
                        from_status: 'free',
                        to_status: 'paid'
                    },
                    {
                        from_status: 'paid',
                        to_status: 'free'
                    },
                    {
                        from_status: 'free',
                        to_status: 'comped'
                    }
                ]
            });

            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: updatedMember.id,
                asserts: [
                    {
                        mrr_delta: 500
                    },
                    {
                        mrr_delta: -500
                    }
                ]
            });
        });

        it('Handles cancellation of old fashioned comped subscriptions correctly', async function () {
            const customer_id = createStripeID('cust');
            const subscription_id = createStripeID('sub');

            const price = {
                id: 'price_123',
                product: 'product_123',
                active: true,
                nickname: 'Complimentary',
                currency: 'usd',
                recurring: {
                    interval: 'month'
                },
                unit_amount: 0,
                type: 'recurring'
            };

            // Create a new subscription in Stripe
            set(subscription, {
                id: subscription_id,
                customer: customer_id,
                status: 'active',
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price
                    }]
                },
                plan: price, // Old stripe thing
                start_date: Date.now() / 1000,
                current_period_end: Date.now() / 1000 + (60 * 60 * 24 * 31),
                cancel_at_period_end: false
            });

            // Create a new customer in Stripe
            set(customer, {
                id: customer_id,
                name: 'Test Member',
                email: 'cancel-complimentary-test@email.com',
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            // Make sure this customer has a corresponding member in the database
            // And all the subscriptions are setup correctly
            const initialMember = await createMemberFromStripe();
            assert.equal(initialMember.status, 'comped', 'The member initial status should be comped');
            assert.equal(initialMember.tiers.length, 1, 'The member should have one tier');
            should(initialMember.subscriptions).match([
                {
                    status: 'active'
                }
            ]);

            // Cancel the previously created subscription in Stripe
            set(subscription, {
                ...subscription,
                status: 'canceled'
            });

            // Send the webhook call to announce the cancelation
            const webhookPayload = JSON.stringify({
                type: 'customer.subscription.updated',
                data: {
                    object: subscription
                }
            });
            const webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);

            // Check status has been updated to 'free' after cancelling
            const {body: body2} = await adminAgent.get('/members/' + initialMember.id + '/');
            assert.equal(body2.members.length, 1, 'The member does not exist');
            const updatedMember = body2.members[0];
            assert.equal(updatedMember.status, 'free');
            assert.equal(updatedMember.tiers.length, 0, 'The member should have no products');
            should(updatedMember.subscriptions).match([
                {
                    status: 'canceled'
                }
            ]);

            // Check the status events for this newly created member (should be NULL -> paid only)
            await assertMemberEvents({
                eventType: 'MemberStatusEvent',
                memberId: updatedMember.id,
                asserts: [
                    {
                        from_status: null,
                        to_status: 'free'
                    },
                    {
                        from_status: 'free',
                        to_status: 'comped'
                    },
                    {
                        from_status: 'comped',
                        to_status: 'free'
                    }
                ]
            });

            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: updatedMember.id,
                asserts: [{
                    type: 'created',
                    mrr_delta: 0
                }, {
                    type: 'expired',
                    mrr_delta: 0
                }]
            });
        });
    });

    describe('checkout.session.completed', function () {
        // The subscription that we got from Stripe was created 2 seconds earlier (used for testing events)
        const beforeNow = Math.floor((Date.now() - 2000) / 1000) * 1000;

        before(async function () {
            const agents = await agentProvider.getAgentsForMembers();
            membersAgent = agents.membersAgent;
            adminAgent = agents.adminAgent;

            await fixtureManager.init('members');
            await adminAgent.loginAsOwner();

            set(subscription, {
                id: 'sub_123',
                customer: 'cus_123',
                status: 'active',
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price: {
                            id: 'price_123',
                            product: 'product_123',
                            active: true,
                            nickname: 'Monthly',
                            currency: 'usd',
                            recurring: {
                                interval: 'month'
                            },
                            unit_amount: 500,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: beforeNow / 1000,
                current_period_end: Math.floor(beforeNow / 1000) + (60 * 60 * 24 * 31),
                cancel_at_period_end: false
            });
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('Will create a member if one does not exist', async function () {
            set(customer, {
                id: 'cus_123',
                name: 'Test Member',
                email: 'checkout-webhook-test@email.com',
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            { // ensure member didn't already exist
                const {body} = await adminAgent.get('/members/?search=checkout-webhook-test@email.com');
                assert.equal(body.members.length, 0, 'A member already existed');
            }

            const webhookPayload = JSON.stringify({
                type: 'checkout.session.completed',
                data: {
                    object: {
                        mode: 'subscription',
                        customer: customer.id,
                        subscription: subscription.id,
                        metadata: {}
                    }
                }
            });

            const webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature);

            const {body} = await adminAgent.get('/members/?search=checkout-webhook-test@email.com');
            assert.equal(body.members.length, 1, 'The member was not created');
            const member = body.members[0];

            assert.equal(member.status, 'paid', 'The member should be "paid"');
            assert.equal(member.subscriptions.length, 1, 'The member should have a single subscription');

            mockManager.assert.sentEmail({
                subject: '🙌 Thank you for signing up to Ghost!',
                to: 'checkout-webhook-test@email.com'
            });

            // Check whether MRR and status has been set
            await assertSubscription(member.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'active',
                cancel_at_period_end: false,
                plan_amount: 500,
                plan_interval: 'month',
                plan_currency: 'usd',
                current_period_end: new Date(Math.floor(beforeNow / 1000) * 1000 + (60 * 60 * 24 * 31 * 1000)),
                mrr: 500
            });

            // Check the status events for this newly created member (should be NULL -> paid only)
            await assertMemberEvents({
                eventType: 'MemberStatusEvent',
                memberId: member.id,
                asserts: [
                    {
                        from_status: null,
                        to_status: 'free',
                        created_at: new Date(member.created_at)
                    },
                    {
                        from_status: 'free',
                        to_status: 'paid',
                        created_at: new Date(beforeNow)
                    }
                ]
            });

            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: member.id,
                asserts: [
                    {
                        mrr_delta: 500
                    }
                ]
            });

            // Wait for the dispatched events (because this happens async)
            await DomainEvents.allSettled();

            mockManager.assert.sentEmail({
                subject: '💸 Paid subscription started: checkout-webhook-test@email.com',
                to: 'jbloggs@example.com'
            });
        });

        it('Will create a member with default newsletter subscriptions', async function () {
            set(customer, {
                id: 'cus_123',
                name: 'Test Member',
                email: 'checkout-newsletter-default-test@email.com',
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            { // ensure member didn't already exist
                const {body} = await adminAgent.get('/members/?search=checkout-newsletter-default-test@email.com');
                assert.equal(body.members.length, 0, 'A member already existed');
            }

            const webhookPayload = JSON.stringify({
                type: 'checkout.session.completed',
                data: {
                    object: {
                        mode: 'subscription',
                        customer: customer.id,
                        subscription: subscription.id,
                        metadata: {}
                    }
                }
            });

            const webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature);

            const {body} = await adminAgent.get('/members/?search=checkout-newsletter-default-test@email.com');
            assert.equal(body.members.length, 1, 'The member was not created');
            const member = body.members[0];

            assert.equal(member.status, 'paid', 'The member should be "paid"');
            assert.equal(member.subscriptions.length, 1, 'The member should have a single subscription');
            assert.equal(member.newsletters.length, 1, 'The member should have a single newsletter');
        });

        it('Will create a member with signup newsletter preference', async function () {
            set(customer, {
                id: 'cus_123',
                name: 'Test Member',
                email: 'checkout-newsletter-test@email.com',
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            { // ensure member didn't already exist
                const {body} = await adminAgent.get('/members/?search=checkout-newsletter-test@email.com');
                assert.equal(body.members.length, 0, 'A member already existed');
            }

            const webhookPayload = JSON.stringify({
                type: 'checkout.session.completed',
                data: {
                    object: {
                        mode: 'subscription',
                        customer: customer.id,
                        subscription: subscription.id,
                        metadata: {
                            newsletters: JSON.stringify([])
                        }
                    }
                }
            });

            const webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature);

            const {body} = await adminAgent.get('/members/?search=checkout-newsletter-test@email.com');
            assert.equal(body.members.length, 1, 'The member was not created');
            const member = body.members[0];

            assert.equal(member.status, 'paid', 'The member should be "paid"');
            assert.equal(member.subscriptions.length, 1, 'The member should have a single subscription');
            assert.equal(member.newsletters.length, 0, 'The member should not have any newsletter subscription');
        });

        it('Does not 500 if the member is unknown', async function () {
            set(paymentMethod, {
                id: 'card_456'
            });

            set(subscription, {
                id: 'sub_456',
                customer: 'cus_456',
                status: 'active',
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_456',
                        price: {
                            id: 'price_456',
                            product: 'product_456',
                            active: true,
                            nickname: 'Monthly',
                            currency: 'usd',
                            recurring: {
                                interval: 'month'
                            },
                            unit_amount: 500,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: Date.now() / 1000,
                current_period_end: Date.now() / 1000 + (60 * 60 * 24 * 31),
                cancel_at_period_end: false
            });

            set(setupIntent, {
                id: 'setup_intent_456',
                payment_method: paymentMethod.id,
                metadata: {
                    customer_id: 'cus_456', // invalid customer id
                    subscription_id: subscription.id
                }
            });

            const webhookPayload = JSON.stringify({
                type: 'checkout.session.completed',
                data: {
                    object: {
                        mode: 'setup',
                        customer: 'cus_456',
                        setup_intent: setupIntent.id
                    }
                }
            });

            const webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);
        });
    });

    describe('Discounts', function () {
        const beforeNow = Math.floor((Date.now() - 2000) / 1000) * 1000;
        let offer;
        let couponId = 'testCoupon123';

        before(async function () {
            const agents = await agentProvider.getAgentsForMembers();
            membersAgent = agents.membersAgent;
            adminAgent = agents.adminAgent;

            await fixtureManager.init('members');
            await adminAgent.loginAsOwner();

            // Create a random offer_id that we'll use
            // The actual amounts don't matter as we'll only take the ones from Stripe ATM
            const newOffer = {
                name: 'Black Friday',
                code: 'black-friday',
                display_title: 'Black Friday Sale!',
                display_description: '10% off on yearly plan',
                type: 'percent',
                cadence: 'year',
                amount: 12,
                duration: 'once',
                duration_in_months: null,
                currency_restriction: false,
                currency: null,
                status: 'active',
                redemption_count: 0,
                tier: {
                    id: (await getPaidProduct()).id
                }
            };

            // Make sure we link this to the right coupon in Stripe
            // This will store the offer with stripe_coupon_id = couponId
            set(coupon, {
                id: couponId
            });

            const {body} = await adminAgent
                .post(`offers/`)
                .body({offers: [newOffer]})
                .expectStatus(200);
            offer = body.offers[0];
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        /**
         * Helper for repetitive tests. It tests the MRR and MRR delta given a discount + a price
         */
        async function testDiscount({discount, interval, unit_amount, assert_mrr, offer_id}) {
            const customer_id = createStripeID('cust');
            const subscription_id = createStripeID('sub');

            discount.customer = customer_id;

            set(subscription, {
                id: subscription_id,
                customer: customer_id,
                status: 'active',
                discount,
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price: {
                            id: 'price_123',
                            product: 'product_123',
                            active: true,
                            nickname: interval,
                            currency: 'usd',
                            recurring: {
                                interval
                            },
                            unit_amount,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: beforeNow / 1000,
                current_period_end: Math.floor(beforeNow / 1000) + (60 * 60 * 24 * 31),
                cancel_at_period_end: false,
                metadata: {}
            });

            set(customer, {
                id: customer_id,
                name: 'Test Member',
                email: `${customer_id}@email.com`,
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            let webhookPayload = JSON.stringify({
                type: 'checkout.session.completed',
                data: {
                    object: {
                        mode: 'subscription',
                        customer: customer.id,
                        subscription: subscription.id,
                        metadata: {}
                    }
                }
            });

            let webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);

            const {body} = await adminAgent.get(`/members/?search=${customer_id}@email.com`);
            assert.equal(body.members.length, 1, 'The member was not created');
            const member = body.members[0];

            assert.equal(member.status, 'paid', 'The member should be "paid"');
            assert.equal(member.subscriptions.length, 1, 'The member should have a single subscription');

            // Check whether MRR and status has been set
            await assertSubscription(member.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'active',
                cancel_at_period_end: false,
                plan_amount: unit_amount,
                plan_interval: interval,
                plan_currency: 'usd',
                current_period_end: new Date(Math.floor(beforeNow / 1000) * 1000 + (60 * 60 * 24 * 31 * 1000)),
                mrr: assert_mrr,
                offer_id: offer_id
            });

            // Check whether the offer attribute is passed correctly in the response when fetching a single member
            member.subscriptions[0].should.match({
                offer: {
                    id: offer_id
                }
            });

            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: member.id,
                asserts: [
                    {
                        mrr_delta: assert_mrr
                    }
                ]
            });

            // Now cancel, and check if the discount is also applied for the cancellation
            set(subscription, {
                ...subscription,
                status: 'canceled'
            });

            // Send the webhook call to announce the cancelation
            webhookPayload = JSON.stringify({
                type: 'customer.subscription.updated',
                data: {
                    object: subscription
                }
            });

            webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);

            // Check status has been updated to 'free' after cancelling
            const {body: body2} = await adminAgent.get('/members/' + member.id + '/');
            assert.equal(body2.members.length, 1, 'The member does not exist');
            const updatedMember = body2.members[0];
            assert.equal(updatedMember.status, 'free');
            assert.equal(updatedMember.tiers.length, 0, 'The member should have no products');
            should(updatedMember.subscriptions).match([
                {
                    status: 'canceled',
                    offer: {
                        id: offer_id
                    }
                }
            ]);

            // Check whether MRR and status has been set
            await assertSubscription(member.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'canceled',
                cancel_at_period_end: false,
                plan_amount: unit_amount,
                plan_interval: interval,
                plan_currency: 'usd',
                mrr: 0,
                offer_id: offer_id
            });

            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: updatedMember.id,
                asserts: [
                    {
                        type: 'created',
                        mrr_delta: assert_mrr
                    },
                    {
                        type: 'expired',
                        mrr_delta: -assert_mrr
                    }
                ]
            });
        }

        it('Correctly includes monthly forever percentage discounts in MRR', async function () {
            // Do you get a offer_id is null failed test here
            // -> check if members-api and members-offers package versions are in sync in yarn.lock or if both are linked in dev
            const discount = {
                id: 'di_1Knkn7HUEDadPGIBPOQgmzIX',
                object: 'discount',
                checkout_session: null,
                coupon: {
                    id: couponId, // This coupon id maps to the created offer above
                    object: 'coupon',
                    amount_off: null,
                    created: 1649774041,
                    currency: 'eur',
                    duration: 'forever',
                    duration_in_months: null,
                    livemode: false,
                    max_redemptions: null,
                    metadata: {},
                    name: '50% off',
                    percent_off: 50,
                    redeem_by: null,
                    times_redeemed: 0,
                    valid: true
                },
                end: null,
                invoice: null,
                invoice_item: null,
                promotion_code: null,
                start: beforeNow / 1000,
                subscription: null
            };
            await testDiscount({
                discount,
                unit_amount: 500,
                interval: 'month',
                assert_mrr: 250,
                offer_id: offer.id
            });
        });

        it('Correctly includes yearly forever percentage discounts in MRR', async function () {
            const discount = {
                id: 'di_1Knkn7HUEDadPGIBPOQgmzIX',
                object: 'discount',
                checkout_session: null,
                coupon: {
                    id: couponId,
                    object: 'coupon',
                    amount_off: null,
                    created: 1649774041,
                    currency: 'eur',
                    duration: 'forever',
                    duration_in_months: null,
                    livemode: false,
                    max_redemptions: null,
                    metadata: {},
                    name: '50% off',
                    percent_off: 50,
                    redeem_by: null,
                    times_redeemed: 0,
                    valid: true
                },
                end: null,
                invoice: null,
                invoice_item: null,
                promotion_code: null,
                start: beforeNow / 1000,
                subscription: null
            };
            await testDiscount({
                discount,
                unit_amount: 1200,
                interval: 'year',
                assert_mrr: 50,
                offer_id: offer.id
            });
        });

        it('Correctly includes monthly forever amount off discounts in MRR', async function () {
            const discount = {
                id: 'di_1Knkn7HUEDadPGIBPOQgmzIX',
                object: 'discount',
                checkout_session: null,
                coupon: {
                    id: couponId,
                    object: 'coupon',
                    amount_off: 1,
                    created: 1649774041,
                    currency: 'eur',
                    duration: 'forever',
                    duration_in_months: null,
                    livemode: false,
                    max_redemptions: null,
                    metadata: {},
                    name: '1 cent off',
                    percent_off: null,
                    redeem_by: null,
                    times_redeemed: 0,
                    valid: true
                },
                end: null,
                invoice: null,
                invoice_item: null,
                promotion_code: null,
                start: beforeNow / 1000,
                subscription: null
            };
            await testDiscount({
                discount,
                unit_amount: 500,
                interval: 'month',
                assert_mrr: 499,
                offer_id: offer.id
            });
        });

        it('Correctly includes yearly forever amount off discounts in MRR', async function () {
            const discount = {
                id: 'di_1Knkn7HUEDadPGIBPOQgmzIX',
                object: 'discount',
                checkout_session: null,
                coupon: {
                    id: couponId,
                    object: 'coupon',
                    amount_off: 60,
                    created: 1649774041,
                    currency: 'eur',
                    duration: 'forever',
                    duration_in_months: null,
                    livemode: false,
                    max_redemptions: null,
                    metadata: {},
                    name: '60 cent off, yearly',
                    percent_off: null,
                    redeem_by: null,
                    times_redeemed: 0,
                    valid: true
                },
                end: null,
                invoice: null,
                invoice_item: null,
                promotion_code: null,
                start: beforeNow / 1000,
                subscription: null
            };
            await testDiscount({
                discount,
                unit_amount: 1200,
                interval: 'year',
                assert_mrr: 95,
                offer_id: offer.id
            });
        });

        it('Does not include repeating discounts in MRR', async function () {
            const discount = {
                id: 'di_1Knkn7HUEDadPGIBPOQgmzIX',
                object: 'discount',
                checkout_session: null,
                coupon: {
                    id: couponId,
                    object: 'coupon',
                    amount_off: null,
                    created: 1649774041,
                    currency: 'eur',
                    duration: 'repeating',
                    duration_in_months: 3,
                    livemode: false,
                    max_redemptions: null,
                    metadata: {},
                    name: '50% off',
                    percent_off: 50,
                    redeem_by: null,
                    times_redeemed: 0,
                    valid: true
                },
                end: Math.floor(beforeNow / 1000) + (60 * 60 * 24 * 31 * 3),
                invoice: null,
                invoice_item: null,
                promotion_code: null,
                start: beforeNow / 1000,
                subscription: null
            };
            await testDiscount({
                discount,
                unit_amount: 500,
                interval: 'month',
                assert_mrr: 500,
                offer_id: offer.id
            });
        });

        it('Also supports adding a discount to an existing subscription', async function () {
            const interval = 'month';
            const unit_amount = 500;
            const mrr_without = 500;
            const mrr_with = 400;
            const mrr_difference = 100;

            const discount = {
                id: 'di_1Knkn7HUEDadPGIBPOQgmzIX',
                object: 'discount',
                checkout_session: null,
                coupon: {
                    id: couponId,
                    object: 'coupon',
                    amount_off: null,
                    created: 1649774041,
                    currency: 'eur',
                    duration: 'forever',
                    duration_in_months: null,
                    livemode: false,
                    max_redemptions: null,
                    metadata: {},
                    name: '20% off',
                    percent_off: 20,
                    redeem_by: null,
                    times_redeemed: 0,
                    valid: true
                },
                end: null,
                invoice: null,
                invoice_item: null,
                promotion_code: null,
                start: beforeNow / 1000,
                subscription: null
            };

            const customer_id = createStripeID('cust');
            const subscription_id = createStripeID('sub');

            discount.customer = customer_id;

            set(subscription, {
                id: subscription_id,
                customer: customer_id,
                status: 'active',
                discount: null,
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price: {
                            id: 'price_123',
                            product: 'product_123',
                            active: true,
                            nickname: interval,
                            currency: 'usd',
                            recurring: {
                                interval
                            },
                            unit_amount,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: beforeNow / 1000,
                current_period_end: Math.floor(beforeNow / 1000) + (60 * 60 * 24 * 31),
                cancel_at_period_end: false
            });

            set(customer, {
                id: customer_id,
                name: 'Test Member',
                email: `${customer_id}@email.com`,
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            let webhookPayload = JSON.stringify({
                type: 'checkout.session.completed',
                data: {
                    object: {
                        mode: 'subscription',
                        customer: customer.id,
                        subscription: subscription.id,
                        metadata: {}
                    }
                }
            });

            let webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature);

            const {body} = await adminAgent.get(`/members/?search=${customer_id}@email.com`);
            assert.equal(body.members.length, 1, 'The member was not created');
            const member = body.members[0];

            assert.equal(member.status, 'paid', 'The member should be "paid"');
            assert.equal(member.subscriptions.length, 1, 'The member should have a single subscription');

            // Check whether MRR and status has been set
            await assertSubscription(member.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'active',
                cancel_at_period_end: false,
                plan_amount: unit_amount,
                plan_interval: interval,
                plan_currency: 'usd',
                current_period_end: new Date(Math.floor(beforeNow / 1000) * 1000 + (60 * 60 * 24 * 31 * 1000)),
                mrr: mrr_without,
                offer_id: null
            });

            // Check whether the offer attribute is passed correctly in the response when fetching a single member
            member.subscriptions[0].should.match({
                offer: null
            });

            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: member.id,
                asserts: [
                    {
                        mrr_delta: mrr_without
                    }
                ]
            });

            // Now add the discount
            set(subscription, {
                ...subscription,
                discount
            });

            // Send the webhook call to announce the cancelation
            webhookPayload = JSON.stringify({
                type: 'customer.subscription.updated',
                data: {
                    object: subscription
                }
            });

            webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);

            // Check status has been updated to 'free' after cancelling
            const {body: body2} = await adminAgent.get('/members/' + member.id + '/');
            const updatedMember = body2.members[0];

            // Check whether MRR and status has been set
            await assertSubscription(updatedMember.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'active',
                cancel_at_period_end: false,
                plan_amount: unit_amount,
                plan_interval: interval,
                plan_currency: 'usd',
                mrr: mrr_with,
                offer_id: offer.id
            });

            // Check whether the offer attribute is passed correctly in the response when fetching a single member
            updatedMember.subscriptions[0].should.match({
                offer: {
                    id: offer.id
                }
            });

            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: updatedMember.id,
                asserts: [
                    {
                        type: 'created',
                        mrr_delta: mrr_without
                    },
                    {
                        type: 'updated',
                        mrr_delta: -mrr_difference
                    }
                ]
            });
        });

        it('Silently ignores an invalid offer id in metadata', async function () {
            const interval = 'month';
            const unit_amount = 500;
            const mrr_with = 400;

            const discount = {
                id: 'di_1Knkn7HUEDadPGIBPOQgmzIX',
                object: 'discount',
                checkout_session: null,
                coupon: {
                    id: 'unknownCoupon', // this one is unknown in Ghost
                    object: 'coupon',
                    amount_off: null,
                    created: 1649774041,
                    currency: 'eur',
                    duration: 'forever',
                    duration_in_months: null,
                    livemode: false,
                    max_redemptions: null,
                    metadata: {},
                    name: '20% off',
                    percent_off: 20,
                    redeem_by: null,
                    times_redeemed: 0,
                    valid: true
                },
                end: null,
                invoice: null,
                invoice_item: null,
                promotion_code: null,
                start: beforeNow / 1000,
                subscription: null
            };

            const customer_id = createStripeID('cust');
            const subscription_id = createStripeID('sub');

            discount.customer = customer_id;

            set(subscription, {
                id: subscription_id,
                customer: customer_id,
                status: 'active',
                discount,
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price: {
                            id: 'price_123',
                            product: 'product_123',
                            active: true,
                            nickname: interval,
                            currency: 'usd',
                            recurring: {
                                interval
                            },
                            unit_amount,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: beforeNow / 1000,
                current_period_end: Math.floor(beforeNow / 1000) + (60 * 60 * 24 * 31),
                cancel_at_period_end: false
            });

            set(customer, {
                id: customer_id,
                name: 'Test Member',
                email: `${customer_id}@email.com`,
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            let webhookPayload = JSON.stringify({
                type: 'checkout.session.completed',
                data: {
                    object: {
                        mode: 'subscription',
                        customer: customer.id,
                        subscription: subscription.id,
                        metadata: {}
                    }
                }
            });

            let webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature);

            const {body} = await adminAgent.get(`/members/?search=${customer_id}@email.com`);
            assert.equal(body.members.length, 1, 'The member was not created');
            const member = body.members[0];

            assert.equal(member.status, 'paid', 'The member should be "paid"');
            assert.equal(member.subscriptions.length, 1, 'The member should have a single subscription');

            // Check whether MRR and status has been set
            await assertSubscription(member.subscriptions[0].id, {
                subscription_id: subscription.id,
                status: 'active',
                cancel_at_period_end: false,
                plan_amount: unit_amount,
                plan_interval: interval,
                plan_currency: 'usd',
                current_period_end: new Date(Math.floor(beforeNow / 1000) * 1000 + (60 * 60 * 24 * 31 * 1000)),
                mrr: mrr_with,
                offer_id: null
            });

            // Check whether the offer attribute is passed correctly in the response when fetching a single member
            member.subscriptions[0].should.match({
                offer: null
            });

            await assertMemberEvents({
                eventType: 'MemberPaidSubscriptionEvent',
                memberId: member.id,
                asserts: [
                    {
                        mrr_delta: mrr_with
                    }
                ]
            });
        });
    });

    // Test if the session metadata is processed correctly
    describe('Member attribution', function () {
        before(async function () {
            const agents = await agentProvider.getAgentsForMembers();
            membersAgent = agents.membersAgent;
            adminAgent = agents.adminAgent;

            await fixtureManager.init('posts', 'products');
            await adminAgent.loginAsOwner();
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        // The subscription that we got from Stripe was created 2 seconds earlier (used for testing events)
        const beforeNow = Math.floor((Date.now() - 2000) / 1000) * 1000;

        const memberMatcherShallowIncludes = {
            id: anyObjectId,
            uuid: anyUuid,
            email: anyString,
            created_at: anyISODateTime,
            updated_at: anyISODateTime,
            subscriptions: anyArray,
            labels: anyArray,
            tiers: anyArray,
            attribution: anyObject,
            newsletters: anyArray
        };

        // Activity feed
        // This test is here because creating subscriptions is a PITA now, and we would need to essentially duplicate all above tests elsewhere
        it('empty initial activity feed', async function () {
            // Check activity feed
            await adminAgent
                .get(`/members/events/?filter=type:subscription_event`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    events: new Array(0).fill({
                        type: anyString,
                        data: anyObject
                    })
                });
        });

        async function testWithAttribution(attribution, attributionResource) {
            const customer_id = createStripeID('cust');
            const subscription_id = createStripeID('sub');

            const interval = 'month';
            const unit_amount = 150;

            set(subscription, {
                id: subscription_id,
                customer: customer_id,
                status: 'active',
                items: {
                    type: 'list',
                    data: [{
                        id: 'item_123',
                        price: {
                            id: 'price_123',
                            product: 'product_123',
                            active: true,
                            nickname: interval,
                            currency: 'usd',
                            recurring: {
                                interval
                            },
                            unit_amount,
                            type: 'recurring'
                        }
                    }]
                },
                start_date: beforeNow / 1000,
                current_period_end: Math.floor(beforeNow / 1000) + (60 * 60 * 24 * 31),
                cancel_at_period_end: false,
                metadata: {}
            });

            set(customer, {
                id: customer_id,
                name: 'Test Member',
                email: `${customer_id}@email.com`,
                subscriptions: {
                    type: 'list',
                    data: [subscription]
                }
            });

            let webhookPayload = JSON.stringify({
                type: 'checkout.session.completed',
                data: {
                    object: {
                        mode: 'subscription',
                        customer: customer.id,
                        subscription: subscription.id,
                        metadata: attribution ? {
                            attribution_id: attribution.id,
                            attribution_url: attribution.url,
                            attribution_type: attribution.type
                        } : {}
                    }
                }
            });

            let webhookSignature = stripe.webhooks.generateTestHeaderString({
                payload: webhookPayload,
                secret: process.env.WEBHOOK_SECRET
            });

            await membersAgent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('content-type', 'application/json')
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);

            const {body} = await adminAgent.get(`/members/?search=${customer_id}@email.com`);
            assert.equal(body.members.length, 1, 'The member was not created');
            const member = body.members[0];

            assert.equal(member.status, 'paid', 'The member should be "paid"');
            assert.equal(member.subscriptions.length, 1, 'The member should have a single subscription');

            // Convert Stripe ID to internal model ID
            const subscriptionModel = await getSubscription(member.subscriptions[0].id);

            await assertMemberEvents({
                eventType: 'SubscriptionCreatedEvent',
                memberId: member.id,
                asserts: [
                    {
                        member_id: member.id,
                        subscription_id: subscriptionModel.id,

                        // Defaults if attribution is not set
                        attribution_id: attribution?.id ?? null,
                        attribution_url: attribution?.url ?? null,
                        attribution_type: attribution?.type ?? null
                    }
                ]
            });

            const memberModel = await getMember(member.id);

            // It also should have created a new member, and a MemberCreatedEvent
            // With the same attributions
            await assertMemberEvents({
                eventType: 'MemberCreatedEvent',
                memberId: member.id,
                asserts: [
                    {
                        member_id: member.id,
                        created_at: memberModel.get('created_at'),

                        // Defaults if attribution is not set
                        attribution_id: attribution?.id ?? null,
                        attribution_url: attribution?.url ?? null,
                        attribution_type: attribution?.type ?? null,
                        source: 'member'
                    }
                ]
            });

            await adminAgent
                .get(`/members/${member.id}/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    members: new Array(1).fill(memberMatcherShallowIncludes)
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body: body3}) => {
                    should(body3.members[0].attribution).eql(attributionResource);
                    should(body3.members[0].subscriptions[0].attribution).eql(attributionResource);
                    subscriptionAttributions.push(body3.members[0].subscriptions[0].attribution);
                });

            return memberModel;
        }

        const subscriptionAttributions = [];

        it('Creates a SubscriptionCreatedEvent with url attribution', async function () {
            // This mainly tests for nullable fields being set to null and handled correctly
            const attribution = {
                id: null,
                url: '/',
                type: 'url'
            };

            const absoluteUrl = urlUtils.createUrl('/', true);

            await testWithAttribution(attribution, {
                id: null,
                url: absoluteUrl,
                type: 'url',
                title: 'homepage',
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
        });

        it('Creates a SubscriptionCreatedEvent with post attribution', async function () {
            const id = fixtureManager.get('posts', 0).id;
            const post = await models.Post.where('id', id).fetch({require: true});

            const attribution = {
                id: post.id,
                url: '/out-of-date-url/',
                type: 'post'
            };

            const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true});

            await testWithAttribution(attribution, {
                id: post.id,
                url: absoluteUrl,
                type: 'post',
                title: post.get('title'),
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
        });

        it('Creates a SubscriptionCreatedEvent with deleted post attribution', async function () {
            const attribution = {
                id: 'doesnt-exist-anylonger',
                url: '/removed-blog-post/',
                type: 'post'
            };

            const absoluteUrl = urlUtils.createUrl('/removed-blog-post/', true);

            await testWithAttribution(attribution, {
                id: null,
                url: absoluteUrl,
                type: 'url',
                title: '/removed-blog-post/',
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
        });

        it('Creates a SubscriptionCreatedEvent with page attribution', async function () {
            const id = fixtureManager.get('posts', 5).id;
            const post = await models.Post.where('id', id).fetch({require: true});

            const attribution = {
                id: post.id,
                url: '/out-of-date-url/',
                type: 'page'
            };

            const absoluteUrl = urlService.getUrlByResourceId(post.id, {absolute: true});

            await testWithAttribution(attribution, {
                id: post.id,
                url: absoluteUrl,
                type: 'page',
                title: post.get('title'),
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
        });

        it('Creates a SubscriptionCreatedEvent with tag attribution', async function () {
            const id = fixtureManager.get('tags', 0).id;
            const tag = await models.Tag.where('id', id).fetch({require: true});

            const attribution = {
                id: tag.id,
                url: '/out-of-date-url/',
                type: 'tag'
            };

            const absoluteUrl = urlService.getUrlByResourceId(tag.id, {absolute: true});

            await testWithAttribution(attribution, {
                id: tag.id,
                url: absoluteUrl,
                type: 'tag',
                title: tag.get('name'),
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
        });

        it('Creates a SubscriptionCreatedEvent with author attribution', async function () {
            const id = fixtureManager.get('users', 0).id;
            const author = await models.User.where('id', id).fetch({require: true});

            const attribution = {
                id: author.id,
                url: '/out-of-date-url/',
                type: 'author'
            };

            const absoluteUrl = urlService.getUrlByResourceId(author.id, {absolute: true});

            await testWithAttribution(attribution, {
                id: author.id,
                url: absoluteUrl,
                type: 'author',
                title: author.get('name'),
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
        });

        it('Creates a SubscriptionCreatedEvent without attribution', async function () {
            const attribution = undefined;
            await testWithAttribution(attribution, {
                id: null,
                url: null,
                type: null,
                title: null,
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
        });

        it('Creates a SubscriptionCreatedEvent with empty attribution object', async function () {
            // Shouldn't happen, but to make sure we handle it
            const attribution = {};
            await testWithAttribution(attribution, {
                id: null,
                url: null,
                type: null,
                title: null,
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
        });

        // Activity feed
        // This test is here because creating subscriptions is a PITA now, and we would need to essentially duplicate all above tests elsewhere
        it('Returns subscription created attributions in activity feed', async function () {
            // Check activity feed
            await adminAgent
                .get(`/members/events/?filter=type:subscription_event`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    events: new Array(subscriptionAttributions.length).fill({
                        data: anyObject
                    })
                })
                .expect(({body}) => {
                    should(body.events.find(e => e.type !== 'subscription_event')).be.undefined();
                    should(body.events.map(e => e.data.attribution)).containDeep(subscriptionAttributions);
                });
        });
    });
});
