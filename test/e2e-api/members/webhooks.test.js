const assert = require('assert');
const nock = require('nock');
const stripe = require('stripe');
const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');

let membersAgent;
let adminAgent;

describe('Members API', function () {
    before(async function () {
        process.env.WEBHOOK_SECRET = 'pissoff';
        // Weird - most of the mocks happen after getting the agent
        // but to mock stripe we want to fake the stripe keys in the settings.
        // And it's initialised at boot - so mocking it before
        // Probably wanna replace this with a settinfs fixture mock or smth??
        mockManager.setupStripe();
        membersAgent = await agentProvider.getMembersAPIAgent();
        adminAgent = await agentProvider.getAdminAPIAgent();
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
        });
    });
});
