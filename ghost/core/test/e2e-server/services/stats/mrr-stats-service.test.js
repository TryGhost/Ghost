const statsService = require('../../../../core/server/services/stats');
const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
require('should');
const {stripeMocker} = require('../../../utils/e2e-framework-mock-manager');
const moment = require('moment');

let agent;

async function createMemberWithSubscription(interval, amount, currency, date) {
    const tier = await stripeMocker.createTier({
        currency,
        monthly_price: amount,
        yearly_price: amount
    });
    const price = await stripeMocker.getPriceForTier(tier.get('slug'), interval);
    const fakeCustomer = stripeMocker.createCustomer({});
    await stripeMocker.createSubscription({
        customer: fakeCustomer,
        price,
        start_date: moment(date).unix()
    }, {
        sendWebhook: false
    });

    const initialMember = {
        name: fakeCustomer.name,
        email: fakeCustomer.email,
        subscribed: true,
        stripe_customer_id: fakeCustomer.id
    };

    await agent
        .post(`/members/`)
        .body({members: [initialMember]})
        .expectStatus(201);
}

describe('MRR Stats Service', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockStripe();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('getCurrentMrr', function () {
        it('Always returns at least one currency', async function () {
            const result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'usd', // need to check capital usage here!
                    mrr: 0
                }
            ]);
        });

        it('Can handle multiple currencies', async function () {
            await createMemberWithSubscription('month', 500, 'eur', '2000-01-10');
            const result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'EUR',
                    mrr: 500
                }
            ]);
        });

        it('Increases MRR by 1 / 12 of yearly subscriptions', async function () {
            await createMemberWithSubscription('year', 12, 'usd', '2000-01-10');
            const result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'EUR',
                    mrr: 500
                },
                {
                    currency: 'USD',
                    mrr: 1
                }
            ]);
        });

        it('Increases MRR with monthly subscriptions', async function () {
            await createMemberWithSubscription('month', 1, 'usd', '2000-01-11');
            const result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'EUR',
                    mrr: 500
                },
                {
                    currency: 'USD',
                    mrr: 2
                }
            ]);
        });

        it('Floors results', async function () {
            await createMemberWithSubscription('year', 17, 'usd', '2000-01-12');
            let result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'EUR',
                    mrr: 500
                },
                {
                    currency: 'USD',
                    mrr: 3
                }
            ]);

            // Floor 11/12 to 0 (same as getMRRDelta method)
            await createMemberWithSubscription('year', 11, 'usd', '2000-01-12');
            result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'EUR',
                    mrr: 500
                },
                {
                    currency: 'USD',
                    mrr: 3
                }
            ]);

            // Floor 11/12 to 0, don't combine with previous addition
            await createMemberWithSubscription('year', 11, 'usd', '2000-01-12');
            result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'EUR',
                    mrr: 500
                },
                {
                    currency: 'USD',
                    mrr: 3
                }
            ]);

            // Floor 13/12 to 1
            await createMemberWithSubscription('year', 13, 'usd', '2000-01-12');
            result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'EUR',
                    mrr: 500
                },
                {
                    currency: 'USD',
                    mrr: 4
                }
            ]);
        });
    });

    describe('fetchAllDeltas', function () {
        it('Returns deltas in ascending order', async function () {
            const results = await statsService.mrr.fetchAllDeltas();
            results.length.should.equal(4);
            results.should.match([
                {
                    date: '2000-01-10',
                    delta: 500,
                    currency: 'EUR'
                },
                {
                    date: '2000-01-10',
                    delta: 1,
                    currency: 'USD'
                },
                {
                    date: '2000-01-11',
                    delta: 1,
                    currency: 'USD'
                },
                {
                    date: '2000-01-12',
                    delta: 2,
                    currency: 'USD'
                }
            ]);
        });
    });
});
