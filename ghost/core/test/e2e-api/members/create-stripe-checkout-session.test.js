const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const nock = require('nock');

let membersAgent, adminAgent, membersService;

describe('Create Stripe Checkout Session', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        membersService = require('../../../core/server/services/members');

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

    it('Does not allow to create a checkout session if the customerEmail is associated with a paid member', async function () {
        const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

        const paidTier = tiers.find(tier => tier.type === 'paid');

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: 'paid@test.com',
                tierId: paidTier.id,
                cadence: 'month'
            })
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyUuid,
                    code: 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION'
                }]
            })
            .matchHeaderSnapshot({
                etag: matchers.anyEtag
            });
    });

    it('Does allow to create a checkout session if the customerEmail is not associated with a paid member', async function () {
        const {body: {tiers}} = await adminAgent.get('/tiers/?include=monthly_price&yearly_price');

        const paidTier = tiers.find(tier => tier.type === 'paid');

        nock('https://api.stripe.com')
            .persist()
            .post(/v1\/.*/)
            .reply((uri, body) => {
                if (uri === '/v1/checkout/sessions') {
                    return [200, {id: 'cs_123'}];
                }

                return [500];
            });

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: 'free@test.com',
                tierId: paidTier.id,
                cadence: 'month'
            })
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot();
    });
});
