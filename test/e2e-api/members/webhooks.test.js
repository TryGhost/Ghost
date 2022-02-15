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
    });
});
