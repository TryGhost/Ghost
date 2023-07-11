const assert = require('assert/strict');
const {
    agentProvider,
    fixtureManager,
    mockManager,
    matchers
} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag} = matchers;

describe('Tiers API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can browse Tiers', async function () {
        await agent
            .get('/tiers/')
            .expectStatus(200)
            .matchBodySnapshot({
                tiers: Array(2).fill({
                    id: matchers.anyObjectId,
                    created_at: matchers.anyISODateTime,
                    updated_at: matchers.anyISODateTime
                })
            });
    });

    it('Errors when price is non-integer', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: 99.99,
            currency: 'usd'
        };

        await agent
            .post('/tiers/')
            .body({tiers: [tier]})
            .expectStatus(422)
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyUuid
                }]
            });
    });

    it('Errors when price is negative', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: -100,
            currency: 'usd'
        };

        await agent
            .post('/tiers/')
            .body({tiers: [tier]})
            .expectStatus(422)
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyUuid
                }]
            });
    });

    it('Errors when price is too large', async function () {
        const tier = {
            name: 'Blah',
            monthly_price: Number.MAX_SAFE_INTEGER,
            currency: 'usd'
        };

        await agent
            .post('/tiers/')
            .body({tiers: [tier]})
            .expectStatus(422)
            .matchBodySnapshot({
                errors: [{
                    id: matchers.anyUuid
                }]
            });
    });

    it('Can read Tiers', async function () {
        const {body: {tiers: [tier]}} = await agent.get('/tiers/');

        await agent.get(`/tiers/${tier.id}/`)
            .expectStatus(200);
    });

    it('Can edit visibility', async function () {
        const {body: {tiers: [tier]}} = await agent.get('/tiers/?filter=type:paid&limit=1');

        const visibility = tier.visibility === 'none' ? 'public' : 'none';

        await agent.put(`/tiers/${tier.id}/`)
            .body({
                tiers: [{
                    visibility
                }]
            })
            .expectStatus(200);

        const {body: {tiers: [updatedTier]}} = await agent.get(`/tiers/${tier.id}/`);

        assert(updatedTier.visibility === visibility, `The visibility of the Tier should have been updated to ${visibility}`);
    });

    it('Can save with trial_days as null', async function () {
        const {body: {tiers: [tier]}} = await agent.get('/tiers/?limit=1');

        await agent.put(`/tiers/${tier.id}/`)
            .body({
                tiers: [{
                    trial_days: null
                }]
            })
            .expectStatus(200);

        const {body: {tiers: [updatedTier]}} = await agent.get(`/tiers/${tier.id}/`);

        assert(updatedTier.trial_days === 0, `The trial_days should have been set to 0`);
    });

    it('Can edit tier properties and relations', async function () {
        let {body: {tiers: [tier]}} = await agent.get('/tiers/?filter=type:paid&limit=1')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                tiers: Array(1).fill({
                    id: matchers.anyObjectId,
                    created_at: matchers.anyISODateTime,
                    updated_at: matchers.anyISODateTime
                })
            });

        await agent.put(`/tiers/${tier.id}/`)
            .body({
                tiers: [{
                    description: 'Updated description',
                    benefits: ['daily cat pictures', 'delicious avo toast']
                }]
            })
            .expectStatus(200);

        await agent.get(`/tiers/${tier.id}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                tiers: Array(1).fill({
                    id: matchers.anyObjectId,
                    created_at: matchers.anyISODateTime,
                    updated_at: matchers.anyISODateTime
                })
            });
    });

    it('Can create a new tier', async function () {
        const tier = {
            name: 'new premium tier',
            monthly_price: 100,
            currency: 'usd'
        };

        await agent
            .post('/tiers/')
            .body({tiers: [tier]})
            .expectStatus(201)
            .matchBodySnapshot({
                tiers: Array(1).fill({
                    id: matchers.anyObjectId,
                    created_at: matchers.anyISODate,
                    name: 'new premium tier',
                    slug: 'new-premium-tier',
                    monthly_price: 100,
                    currency: 'USD'
                })
            });
    });
});
