const crypto = require('crypto');
const assert = require('assert');
const nock = require('nock');
const should = require('should');
const stripe = require('stripe');
const {Product} = require('../../../core/server/models/product');
const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const offers = require('../../../core/server/services/offers');

let membersAgent;
let adminAgent;

function createStripeID(prefix) {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

async function getPaidProduct() {
    return await Product.findOne({type: 'paid'});
}

async function assertMemberEvents({eventType, memberId, asserts}) {
    const events = (await models[eventType].where('member_id', memberId).fetchAll()).toJSON();
    events.should.match(asserts);
    assert.equal(events.length, asserts.length, `Only ${asserts.length} ${eventType} should have been added.`);
}

async function assertSubscription(subscriptionId, asserts) {
    // eslint-disable-next-line dot-notation
    const subscription = await models['StripeCustomerSubscription'].where('subscription_id', subscriptionId).fetch({require: true});

    // We use the native toJSON to prevent calling the overriden serialize method
    models.Base.Model.prototype.serialize.call(subscription).should.match(asserts);
}

describe('Members API', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        await fixtureManager.init('members');
        await adminAgent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockStripe();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // @todo: Test what happens when a complementary subscription ends (should create comped -> free event)
    // @todo: Test what happens when a complementary subscription starts a paid subscription

    describe('/webhooks/stripe/', function () {
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
                .reply((uri, body) => {
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
                .reply((uri, body) => {
                    const [match, resource, id, action] = uri.match(/\/?v1\/(\w+)(?:\/?(\w+)){0,2}/) || [null];

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
            nock.cleanAll();
        });

        // Helper methods to update the customer and subscription
        function set(object, newValues) {
            for (const key of Object.keys(object)) {
                delete object[key];
            }
            Object.assign(object, newValues);
        }

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
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);
        });

        it('Handles cancellation of paid subscriptions correctly', async function () {
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
                            currency: 'USD',
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
                name: 'Test Member',
                email: 'expired-paid-test@email.com',
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

            // Cancel the previously created subscription in Stripe
            set(subscription, {
                ...subscription,
                cancel_at_period_end: true
            });

            // Send the webhook call to anounce the cancelation
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
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);

            // Check status has been updated to 'free' after cancelling
            const {body: body2} = await adminAgent.get('/members/' + initialMember.id + '/');
            assert.equal(body2.members.length, 1, 'The member does not exist');
            const updatedMember = body2.members[0];
            assert.equal(updatedMember.status, 'paid');
            assert.equal(updatedMember.tiers.length, 1, 'The member should have tiers');
            should(updatedMember.subscriptions).match([
                {
                    cancel_at_period_end: true
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
                        to_status: 'paid'
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
                        type: 'canceled',
                        mrr_delta: -500
                    }
                ]
            });
        });

        describe('Handling the end of subscriptions', function () {
            let canceledPaidMember;

            it('Handles cancellation of paid subscriptions correctly', async function () {
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
                    name: 'Test Member',
                    email: 'cancel-paid-test@email.com',
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
                    status: 'canceled'
                });

                // Send the webhook call to anounce the cancelation
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
                    email: 'cancel-complementary-test@email.com',
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

                // Send the webhook call to anounce the cancelation
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
            before(function () {
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
                    .header('stripe-signature', webhookSignature)
                    .expectStatus(200);
            });
        });

        describe('Discounts', function () {
            const beforeNow = Math.floor((Date.now() - 2000) / 1000) * 1000;
            let offer;
            let couponId = 'testCoupon123';

            before(async function () {
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

                // Send the webhook call to anounce the cancelation
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

                // Send the webhook call to anounce the cancelation
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
    });
});
