const assert = require('node:assert/strict');
const DomainEvents = require('@tryghost/domain-events');
const models = require('../../../core/server/models');
const {getSignedAdminToken} = require('../../../core/server/adapters/scheduling/utils');
const {agentProvider, fixtureManager, mockManager, assertions} = require('../../utils/e2e-framework');

const {cacheInvalidateHeaderNotSet} = assertions;

describe('Gift Deliveries API', function () {
    let agent;
    let paidTier;
    let schedulerToken;
    let emailMockReceiver;
    let giftSequence = 0;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('integrations', 'api_keys', 'newsletters', 'members:newsletters');

        const schedulerKey = await models.Integration.getApiKeyBySlug('ghost-scheduler', 'admin');
        schedulerToken = getSignedAdminToken({
            publishedAt: new Date().toISOString(),
            apiUrl: '/admin/',
            key: schedulerKey
        });
        paidTier = await models.Product.findOne({type: 'paid'}, {require: true});
    });

    beforeEach(function () {
        emailMockReceiver = mockManager.mockMail();
        mockManager.mockLabsEnabled('giftSubCustomization');
    });

    afterEach(async function () {
        await DomainEvents.allSettled();
        await models.GiftDelivery.query().del();
        await models.Gift.query().del();
        mockManager.restore();
    });

    async function createPendingEmailGift() {
        giftSequence += 1;
        const now = new Date();

        const gift = await models.Gift.add({
            token: `delivery-api-token-${giftSequence}`,
            buyer_email: `buyer-${giftSequence}@example.com`,
            buyer_member_id: null,
            buyer_name: 'Gift Buyer',
            recipient_name: 'Gift Recipient',
            personal_message: 'Enjoy your gift!',
            redeemer_member_id: null,
            tier_id: paidTier.id,
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripe_checkout_session_id: `cs_delivery_api_${giftSequence}`,
            stripe_payment_intent_id: `pi_delivery_api_${giftSequence}`,
            consumes_at: null,
            available_at: now,
            expires_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            status: 'purchased',
            purchased_at: now,
            redeemed_at: null,
            consumed_at: null,
            expired_at: null,
            refunded_at: null,
            consumes_soon_reminder_sent_at: null
        });
        const delivery = await models.GiftDelivery.add({
            gift_id: gift.id,
            recipient_email: `recipient-${giftSequence}@example.com`,
            status: 'pending',
            attempts: 0,
            attempt_at: null,
            email_sent_at: null,
            email_provider_message_id: null,
            outcome: 'unknown',
            outcome_at: null,
            outcome_error: null
        });

        return {gift, delivery};
    }

    it('claims, sends, and marks a pending delivery as sent', async function () {
        const {gift, delivery} = await createPendingEmailGift();

        await agent
            .put(`gifts/flush_deliveries/?token=${schedulerToken}`)
            .expectStatus(204)
            .expectEmptyBody()
            .expect(cacheInvalidateHeaderNotSet());
        await DomainEvents.allSettled();

        emailMockReceiver.assertSentEmailCount(1);
        assert.equal(emailMockReceiver.getSentEmail(0).to, delivery.get('recipient_email'));

        const reloaded = await models.GiftDelivery.findOne({gift_id: gift.id}, {require: true});
        assert.equal(reloaded.get('status'), 'sent');
        assert.equal(reloaded.get('attempts'), 1);
        assert.ok(reloaded.get('email_sent_at'));
    });

    it('rejects a flush request without a scheduler token', async function () {
        const {gift} = await createPendingEmailGift();

        await agent
            .put('gifts/flush_deliveries/')
            .expectStatus(401)
            .expect(cacheInvalidateHeaderNotSet());
        await DomainEvents.allSettled();

        emailMockReceiver.assertSentEmailCount(0);
        const reloaded = await models.GiftDelivery.findOne({gift_id: gift.id}, {require: true});
        assert.equal(reloaded.get('status'), 'pending');
        assert.equal(reloaded.get('attempts'), 0);
    });

    it('does not process deliveries when gift customization is disabled', async function () {
        mockManager.mockLabsDisabled('giftSubCustomization');
        const {gift} = await createPendingEmailGift();

        await agent
            .put(`gifts/flush_deliveries/?token=${schedulerToken}`)
            .expectStatus(204)
            .expectEmptyBody()
            .expect(cacheInvalidateHeaderNotSet());
        await DomainEvents.allSettled();

        emailMockReceiver.assertSentEmailCount(0);
        const reloaded = await models.GiftDelivery.findOne({gift_id: gift.id}, {require: true});
        assert.equal(reloaded.get('status'), 'pending');
        assert.equal(reloaded.get('attempts'), 0);
    });
});
