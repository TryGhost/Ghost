const assert = require('assert');
const nock = require('nock');
const stripe = require('stripe');
const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');

let agent;

describe('Members API', function () {
    before(async function () {
        process.env.WEBHOOK_SECRET = 'pissoff';
        // Weird - most of the mocks happen after getting the agent
        // but to mock stripe we want to fake the stripe keys in the settings.
        // And it's initialised at boot - so mocking it before
        // Probably wanna replace this with a settinfs fixture mock or smth??
        mockManager.setupStripe();
        agent = await agentProvider.getMembersAPIAgent();
        await fixtureManager.init('members');
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
        await agent.get('/api/site/')
            .expectStatus(200);
    });

    describe('/webhooks/stripe/', function () {
        it('Responds with a 401 when the signature is invalid', async function () {
            await agent.post('/webhooks/stripe/')
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

            await agent.post('/webhooks/stripe/')
                .body(webhookPayload)
                .header('stripe-signature', webhookSignature)
                .expectStatus(200);
        });

        describe('checkout.session.completed', function() {
            it('Will create a member if one does not exist', async function() {
                const webhookPayload = JSON.stringify({
                    type: 'checkout.session.completed',
                    data: {
                        object: {
                            mode: 'subscription',
                            customer: 'cus_123',
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
                                currency: 'USD'
                            }
                        }]
                    }
                };

                const customer = {
                    id: 'cus_123',
                    name: 'Test Member',
                    email: 'test-member@email.com',
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

                // '/v1/customers/cus_123?expand[0]=subscriptions.data.default_payment_method&expand[1]=subscriptions'

                const res = await agent.post('/webhooks/stripe/')
                    .body(webhookPayload)
                    .header('stripe-signature', webhookSignature);

                // console.log(res);
            });
        });
    });
});
