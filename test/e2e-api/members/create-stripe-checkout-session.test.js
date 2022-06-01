const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');

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

    it('Will not set a cookie if the token is invalid', async function () {
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
              });
    });
});
