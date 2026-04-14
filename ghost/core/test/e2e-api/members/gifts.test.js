const assert = require('node:assert/strict');
const {agentProvider, fixtureManager, mockManager, configUtils} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Members Gifts', function () {
    let membersAgent;
    let paidProduct;
    let giftSequence = 0;

    const alreadyRedeemedMessage = 'This gift has already been redeemed.';
    const activeSubscriptionMessage = 'You already have an active subscription.';
    const notFoundMessage = 'This gift does not exist.';

    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();

        await fixtureManager.init('members');

        paidProduct = await models.Product.findOne({
            type: 'paid'
        }, {
            require: true,
            withRelated: ['benefits']
        });
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('giftSubscriptions');
    });

    afterEach(async function () {
        await configUtils.restore();
        mockManager.restore();
    });

    async function createGift(overrides = {}) {
        giftSequence += 1;

        const sequence = giftSequence;
        const now = new Date('2026-04-07T10:00:00.000Z');
        const expiresAt = new Date('2030-01-01T00:00:00.000Z');

        return await models.Gift.add({
            token: `gift-token-${sequence}`,
            buyer_email: `gift-buyer-${sequence}@example.com`,
            buyer_member_id: null,
            redeemer_member_id: null,
            tier_id: paidProduct.id,
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripe_checkout_session_id: `cs_gift_${sequence}`,
            stripe_payment_intent_id: `pi_gift_${sequence}`,
            consumes_at: null,
            expires_at: expiresAt,
            status: 'purchased',
            purchased_at: now,
            redeemed_at: null,
            consumed_at: null,
            expired_at: null,
            refunded_at: null,
            ...overrides
        });
    }

    async function createCompedMemberAgent() {
        const agent = membersAgent.duplicate();
        const email = `gift-comped-${giftSequence + 1}@example.com`;

        await agent.loginAs(email);

        const member = await models.Member.findOne({email}, {require: true});

        await models.Member.edit({
            status: 'comped',
            products: [{
                id: paidProduct.id
            }]
        }, {
            id: member.id
        });

        return agent;
    }

    it('returns gift details for an anonymous visitor when the token is redeemable', async function () {
        const gift = await createGift();

        const {body} = await membersAgent
            .get(`/api/gifts/${gift.get('token')}/redeem/`)
            .expectStatus(200);

        assert.equal(body.gifts.length, 1);
        assert.equal(body.gifts[0].token, gift.get('token'));
        assert.equal(body.gifts[0].cadence, 'year');
        assert.equal(body.gifts[0].duration, 1);
        assert.equal(body.gifts[0].currency, 'usd');
        assert.equal(body.gifts[0].amount, 5000);
        assert.equal(body.gifts[0].expires_at, '2030-01-01T00:00:00.000Z');
        assert.deepEqual(body.gifts[0].tier, {
            id: paidProduct.id,
            name: paidProduct.get('name'),
            description: paidProduct.get('description'),
            benefits: paidProduct.related('benefits').toJSON().map(item => item.name)
        });
        assert.equal(body.gifts[0].buyer_email, undefined);
        assert.equal(body.gifts[0].redeemed_at, undefined);
        assert.equal(body.gifts[0].status, undefined);
        assert.equal(body.gifts[0].consumes_at, null);
    });

    it('returns gift details for a logged-in free member when the token is redeemable', async function () {
        const agent = membersAgent.duplicate();
        const gift = await createGift();

        await agent.loginAs(`gift-free-${giftSequence + 1}@example.com`);

        const {body} = await agent
            .get(`/api/gifts/${gift.get('token')}/redeem/`)
            .expectStatus(200);

        assert.equal(body.gifts[0].token, gift.get('token'));
    });

    it('returns 400 when the logged-in member already has a paid subscription', async function () {
        const agent = membersAgent.duplicate();
        const gift = await createGift();

        await agent.loginAs('paid@test.com');

        const {body} = await agent
            .get(`/api/gifts/${gift.get('token')}/redeem/`)
            .expectStatus(400);

        assert.equal(body.errors[0].message, activeSubscriptionMessage);
    });

    it('returns 400 when the logged-in member already has a comped subscription', async function () {
        const agent = await createCompedMemberAgent();
        const gift = await createGift();

        const {body} = await agent
            .get(`/api/gifts/${gift.get('token')}/redeem/`)
            .expectStatus(400);

        assert.equal(body.errors[0].message, activeSubscriptionMessage);
    });

    it('returns 404 when the gift token does not exist', async function () {
        const {body} = await membersAgent
            .get('/api/gifts/nonexistent-token/redeem/')
            .expectStatus(404);

        assert.equal(body.errors[0].message, notFoundMessage);
    });

    it('redeems a gift for a logged-in free member via POST', async function () {
        const agent = membersAgent.duplicate();
        const email = `gift-post-free-${giftSequence + 1}@example.com`;
        const gift = await createGift();

        await agent.loginAs(email);

        const {body} = await agent
            .post(`/api/gifts/${gift.get('token')}/redeem/`)
            .body({})
            .expectStatus(200);

        await gift.refresh();

        const member = await models.Member.findOne({email}, {require: true});

        assert.equal(body.gifts[0].token, gift.get('token'));
        assert.equal(body.gifts[0].status, undefined);
        assert.ok(body.gifts[0].consumes_at);
        assert.equal(member.get('status'), 'gift');
        assert.equal(gift.get('status'), 'redeemed');
        assert.equal(gift.get('redeemer_member_id'), member.id);
        assert.ok(gift.get('redeemed_at'));
        assert.ok(gift.get('consumes_at'));

        const memberResponse = await agent
            .get('/api/member/')
            .expectStatus(200);

        assert.equal(memberResponse.body.status, 'gift');
    });

    it('returns 401 when redeeming a gift via POST without a member session', async function () {
        const gift = await createGift();

        const {body} = await membersAgent
            .post(`/api/gifts/${gift.get('token')}/redeem/`)
            .body({})
            .expectStatus(401);

        assert.equal(body.errors[0].type, 'UnauthorizedError');
    });

    it('returns 400 when redeeming a gift via POST for a paid member', async function () {
        const agent = membersAgent.duplicate();
        const gift = await createGift();

        await agent.loginAs('paid@test.com');

        const {body} = await agent
            .post(`/api/gifts/${gift.get('token')}/redeem/`)
            .body({})
            .expectStatus(400);

        assert.equal(body.errors[0].message, activeSubscriptionMessage);
    });

    it('returns 400 when redeeming a gift via POST a second time', async function () {
        const firstAgent = membersAgent.duplicate();
        const secondAgent = membersAgent.duplicate();
        const firstEmail = `gift-post-first-${giftSequence + 1}@example.com`;
        const secondEmail = `gift-post-second-${giftSequence + 2}@example.com`;
        const gift = await createGift();

        await firstAgent.loginAs(firstEmail);
        await firstAgent
            .post(`/api/gifts/${gift.get('token')}/redeem/`)
            .body({})
            .expectStatus(200);

        await secondAgent.loginAs(secondEmail);

        const {body} = await secondAgent
            .post(`/api/gifts/${gift.get('token')}/redeem/`)
            .body({})
            .expectStatus(400);

        assert.equal(body.errors[0].message, alreadyRedeemedMessage);
    });

    it('only redeems a gift once when two members redeem concurrently', async function () {
        const firstAgent = membersAgent.duplicate();
        const secondAgent = membersAgent.duplicate();
        const firstEmail = `gift-concurrent-first-${giftSequence + 1}@example.com`;
        const secondEmail = `gift-concurrent-second-${giftSequence + 2}@example.com`;
        const gift = await createGift();
        const redeemPath = `/api/gifts/${gift.get('token')}/redeem/`;

        await firstAgent.loginAs(firstEmail);
        await secondAgent.loginAs(secondEmail);

        const settledResults = await Promise.allSettled([
            firstAgent.post(redeemPath).body({}),
            secondAgent.post(redeemPath).body({})
        ]);

        assert.equal(settledResults[0].status, 'fulfilled');
        assert.equal(settledResults[1].status, 'fulfilled');

        const responses = settledResults.map(result => result.value);
        const statusCodes = responses.map(response => response.statusCode).sort((a, b) => a - b);
        const successResponses = responses.filter(response => response.statusCode === 200);
        const failureResponses = responses.filter(response => response.statusCode === 400);

        assert.deepEqual(statusCodes, [200, 400]);
        assert.equal(successResponses.length, 1);
        assert.equal(failureResponses.length, 1);
        assert.equal(failureResponses[0].body.errors[0].message, alreadyRedeemedMessage);

        await gift.refresh();

        const firstMember = await models.Member.findOne({email: firstEmail}, {require: true, withRelated: ['products']});
        const secondMember = await models.Member.findOne({email: secondEmail}, {require: true, withRelated: ['products']});
        const giftMembers = [firstMember, secondMember].filter(member => member.get('status') === 'gift');
        const freeMembers = [firstMember, secondMember].filter(member => member.get('status') === 'free');

        assert.equal(gift.get('status'), 'redeemed');
        assert.ok(gift.get('redeemed_at'));
        assert.ok(gift.get('consumes_at'));
        assert.equal(giftMembers.length, 1);
        assert.equal(freeMembers.length, 1);
        assert.equal(giftMembers[0].related('products').length, 1);
        assert.equal(giftMembers[0].related('products').models[0].id, paidProduct.id);
        assert.equal(freeMembers[0].related('products').length, 0);
        assert.equal(gift.get('redeemer_member_id'), giftMembers[0].id);
    });
});
