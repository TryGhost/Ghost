const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {mockStripe, stripeMocker} = require('../../utils/e2e-framework-mock-manager');
const {anyContentVersion, anyEtag, anyISODate, anyObjectId} = matchers;
const assert = require('assert/strict');

let agent;

const matchSubscriptionStats = {
    stats: [{
        date: anyISODate,
        tier: anyObjectId
    }, {
        date: anyISODate,
        tier: anyObjectId
    }],
    meta: {
        tiers: [anyObjectId],
        totals: [{
            tier: anyObjectId
        }]
    }
};

describe('Stats API', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'members');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        mockStripe();
        mockManager.mockMail();
    });

    afterEach(async function () {
        await mockManager.restore();
    });

    it('Can fetch member count history', async function () {
        await agent
            .get(`/stats/member_count`)
            .expectStatus(200)
            .matchBodySnapshot({
                stats: [{
                    date: anyISODate
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can fetch MRR history', async function () {
        await agent
            .get(`/stats/mrr`)
            .expectStatus(200)
            .matchBodySnapshot({
                stats: [{
                    date: anyISODate
                }, {
                    date: anyISODate
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    describe('Subscriptions history', function () {
        it('Can fetch subscriptions history', async function () {
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can fetch history for free trials', async function () {
            // Get stats before tests
            const {body: before} = await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200);

            const customer = stripeMocker.createCustomer();
            const price = await stripeMocker.getPriceForTier('default-product', 'month');
            const subscription = await stripeMocker.createTrialSubscription({
                customer,
                price
            });

            // Check the stats have not changed
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.deepEqual(body, before, 'A free trial should not be counted as a paid subscriber');
                });

            // Activate the subscription
            await stripeMocker.updateSubscription({
                id: subscription.id,
                status: 'active',
                trial_end_at: null
            });

            // Check the stats have changed
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.notDeepEqual(body, before, 'The stats should change after a free trial is activated');
                });
        });

        it('Can fetch history for 3D secure payments', async function () {
            // Get stats before tests
            const {body: before} = await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200);

            const customer = stripeMocker.createCustomer();
            const price = await stripeMocker.getPriceForTier('default-product', 'month');
            const subscription = await stripeMocker.createIncompleteSubscription({
                customer,
                price
            });

            // Check the stats have not changed
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.deepEqual(body, before, 'An incomplete subscription should not be counted as a paid subscriber');
                });

            // Activate the subscription
            await stripeMocker.updateSubscription({
                id: subscription.id,
                status: 'active'
            });

            // Check the stats have changed
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.notDeepEqual(body, before, 'The stats should change after an incomplete subscription is activated');
                });
        });
    });

    describe('Post attribution stats', function () {
        it('Can fetch attribution stats', async function () {
            await agent
                .get(`/stats/referrers/posts/${fixtureManager.get('posts', 1).id}/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    stats: [
                        {
                            source: 'Direct',
                            signups: 2,
                            paid_conversions: 1
                        },
                        {
                            source: 'Twitter',
                            signups: 1,
                            paid_conversions: 0
                        }
                    ],
                    meta: {}
                });
        });
    });

    describe('Referrer source history stats', function () {
        it('Can fetch attribution stats', async function () {
            await agent
                .get(`/stats/referrers/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    stats: [
                        {
                            date: anyISODate,
                            source: null,
                            signups: 2,
                            paid_conversions: 2
                        },
                        {
                            date: anyISODate,
                            source: 'Direct',
                            signups: 4,
                            paid_conversions: 1
                        },
                        {
                            date: anyISODate,
                            source: 'Twitter',
                            signups: 4,
                            paid_conversions: 2
                        }
                    ],
                    meta: {}
                });
        });
    });
});
