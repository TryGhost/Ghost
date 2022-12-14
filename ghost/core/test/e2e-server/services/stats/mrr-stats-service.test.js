const statsService = require('../../../../core/server/services/stats');
const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const moment = require('moment');
require('should');
const nock = require('nock');

let agent;
let counter = 0;

async function createMemberWithSubscription(interval, amount, currency, date) {
    counter += 1;

    const fakePrice = {
        id: 'price_' + counter,
        product: '',
        active: true,
        nickname: 'Paid',
        unit_amount: amount,
        currency,
        type: 'recurring',
        recurring: {
            interval
        }
    };

    const fakeSubscription = {
        id: 'sub_' + counter,
        customer: 'cus_' + counter,
        status: 'active',
        cancel_at_period_end: false,
        metadata: {},
        current_period_end: Date.now() / 1000 + 1000,
        start_date: moment(date).unix(),
        plan: fakePrice,
        items: {
            data: [{
                price: fakePrice
            }]
        }
    };

    const fakeCustomer = {
        id: 'cus_' + counter,
        name: 'Test Member',
        email: 'create-member-subscription-' + counter + '@email.com',
        subscriptions: {
            type: 'list',
            data: [fakeSubscription]
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
                return [200, fakeCustomer];
            }

            if (resource === 'subscriptions') {
                return [200, fakeSubscription];
            }
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

    nock.cleanAll();
}

describe('MRR Stats Service', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    afterEach(function () {
        nock.cleanAll();
    });

    describe('getCurrentMrr', function () {
        it('Always returns at least one currency', async function () {
            const result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'usd',
                    mrr: 0
                }
            ]);
        });

        it('Can handle multiple currencies', async function () {
            await createMemberWithSubscription('month', 500, 'eur', '2000-01-10');
            const result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'eur',
                    mrr: 500
                }
            ]);
        });
    
        it('Increases MRR by 1 / 12 of yearly subscriptions', async function () {
            await createMemberWithSubscription('year', 12, 'usd', '2000-01-10');
            const result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'eur',
                    mrr: 500
                },
                {
                    currency: 'usd',
                    mrr: 1
                }
            ]);
        });
    
        it('Increases MRR with monthly subscriptions', async function () {
            await createMemberWithSubscription('month', 1, 'usd', '2000-01-11');
            const result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'eur',
                    mrr: 500
                },
                {
                    currency: 'usd',
                    mrr: 2
                }
            ]);
        });

        it('Floors results', async function () {
            await createMemberWithSubscription('year', 17, 'usd', '2000-01-12');
            let result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'eur',
                    mrr: 500
                },
                {
                    currency: 'usd',
                    mrr: 3
                }
            ]);

            // Floor 11/12 to 0 (same as getMRRDelta method)
            await createMemberWithSubscription('year', 11, 'usd', '2000-01-12');
            result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'eur',
                    mrr: 500
                },
                {
                    currency: 'usd',
                    mrr: 3
                }
            ]);

            // Floor 11/12 to 0, don't combine with previous addition
            await createMemberWithSubscription('year', 11, 'usd', '2000-01-12');
            result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'eur',
                    mrr: 500
                },
                {
                    currency: 'usd',
                    mrr: 3
                }
            ]);

            // Floor 13/12 to 1
            await createMemberWithSubscription('year', 13, 'usd', '2000-01-12');
            result = await statsService.mrr.getCurrentMrr();
            result.should.eql([
                {
                    currency: 'eur',
                    mrr: 500
                },
                {
                    currency: 'usd',
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
                    currency: 'eur'
                },
                {
                    date: '2000-01-10',
                    delta: 1,
                    currency: 'usd'
                },
                {
                    date: '2000-01-11',
                    delta: 1,
                    currency: 'usd'
                },
                {
                    date: '2000-01-12',
                    delta: 2,
                    currency: 'usd'
                }
            ]);
        });
    });
});
