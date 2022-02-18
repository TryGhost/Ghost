const assert = require('assert');
const nock = require('nock');
const stripe = require('stripe');
const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');

let membersAgent;
let adminAgent;

describe('Members API', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        await fixtureManager.init('members');
        await adminAgent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('multipleProducts');
        mockManager.mockMail();
        mockManager.mockStripe();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can communicate with the frontend Members API', async function () {
        await membersAgent.get('/api/site/')
            .expectStatus(200);
    });

    describe('/webhooks/stripe/', function () {
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

        describe('checkout.session.completed', function () {
            it('Will create a member if one does not exist', async function () {
                const webhookPayload = JSON.stringify({
                    type: 'checkout.session.completed',
                    data: {
                        object: {
                            mode: 'subscription',
                            customer: 'cus_123',
                            subscription: 'sub_123',
                            metadata: {}
                        }
                    }
                });

                const webhookSignature = stripe.webhooks.generateTestHeaderString({
                    payload: webhookPayload,
                    secret: process.env.WEBHOOK_SECRET
                });

                const subscription = {
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
                };

                const customer = {
                    id: 'cus_123',
                    name: 'Test Member',
                    email: 'checkout-webhook-test@email.com',
                    subscriptions: {
                        type: 'list',
                        data: [subscription]
                    }
                };

                nock('https://api.stripe.com')
                    .persist()
                    .get(/v1\/.*/)
                    .reply((uri, body) => {
                        const [match, resource, id] = uri.match(/\/?v1\/(\w+)\/?(\w+)/) || [null];

                        if (!match) {
                            return [500];
                        }

                        if (resource === 'customers') {
                            return [200, customer];
                        }

                        if (resource === 'subscriptions') {
                            return [200, subscription];
                        }
                    });

                { // ensure member didn't already exist
                    const {body} = await adminAgent.get('/members/?search=checkout-webhook-test@email.com');
                    assert.equal(body.members.length, 0, 'A member already existed');
                }

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
            });

            it('Does not 500 if the member is unknown', async function () {
                const setupIntent = {
                    id: 'setup_intent_456',
                    payment_method: 'card_456',
                    metadata: {
                        customer_id: 'cus_456',
                        subscription_id: 'sub_456'
                    }
                };

                const paymentMethod = {
                    id: 'card_456'
                };

                const webhookPayload = JSON.stringify({
                    type: 'checkout.session.completed',
                    data: {
                        object: {
                            mode: 'setup',
                            customer: 'cus_456',
                            setup_intent: 'setup_intent_456'
                        }
                    }
                });

                const webhookSignature = stripe.webhooks.generateTestHeaderString({
                    payload: webhookPayload,
                    secret: process.env.WEBHOOK_SECRET
                });

                const subscription = {
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
                };

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

                        if (resource === 'subscriptions') {
                            return [200, subscription];
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

                        return [500];
                    });

                await membersAgent.post('/webhooks/stripe/')
                    .body(webhookPayload)
                    .header('stripe-signature', webhookSignature)
                    .expectStatus(200);
            });
        });
    });
});
