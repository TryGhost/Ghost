const assert = require('node:assert/strict');
const {agentProvider, fixtureManager, mockManager, configUtils} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Members Gifts', function () {
    let membersAgent;
    let paidProduct;
    let giftSequence = 0;

    const alreadyRedeemedMessage = 'This gift has already been redeemed.';
    const alreadyConsumedMessage = 'This gift has already been consumed.';
    const expiredMessage = 'This gift has expired.';
    const refundedMessage = 'This gift has been refunded.';
    const activeSubscriptionMessage = 'You already have an active subscription.';
    const notFoundMessage = 'Gift not found.';

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

    it('returns 400 when the gift has already been redeemed', async function () {
        const redeemedAt = new Date('2026-04-07T11:00:00.000Z');
        const gift = await createGift({
            status: 'redeemed',
            redeemed_at: redeemedAt
        });

        const {body} = await membersAgent
            .get(`/api/gifts/${gift.get('token')}/redeem/`)
            .expectStatus(400);

        assert.equal(body.errors[0].message, alreadyRedeemedMessage);
    });

    it('returns 400 when the gift has already been consumed', async function () {
        const consumedAt = new Date('2026-04-07T11:00:00.000Z');
        const gift = await createGift({
            status: 'consumed',
            consumed_at: consumedAt
        });

        const {body} = await membersAgent
            .get(`/api/gifts/${gift.get('token')}/redeem/`)
            .expectStatus(400);

        assert.equal(body.errors[0].message, alreadyConsumedMessage);
    });

    it('returns 400 when the gift has expired', async function () {
        const expiredAt = new Date('2026-04-07T11:00:00.000Z');
        const gift = await createGift({
            status: 'expired',
            expired_at: expiredAt
        });

        const {body} = await membersAgent
            .get(`/api/gifts/${gift.get('token')}/redeem/`)
            .expectStatus(400);

        assert.equal(body.errors[0].message, expiredMessage);
    });

    it('returns 400 when the gift has been refunded', async function () {
        const refundedAt = new Date('2026-04-07T11:00:00.000Z');
        const gift = await createGift({
            status: 'refunded',
            refunded_at: refundedAt
        });

        const {body} = await membersAgent
            .get(`/api/gifts/${gift.get('token')}/redeem/`)
            .expectStatus(400);

        assert.equal(body.errors[0].message, refundedMessage);
    });

    it('returns 404 when the gift token does not exist', async function () {
        const {body} = await membersAgent
            .get('/api/gifts/nonexistent-token/redeem/')
            .expectStatus(404);

        assert.equal(body.errors[0].message, notFoundMessage);
    });
});
