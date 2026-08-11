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
        await models.Gift.query().del();
        mockManager.restore();
    });

    async function createPendingEmailGift() {
        giftSequence += 1;
        const now = new Date();

        return await models.Gift.add({
            token: `delivery-api-token-${giftSequence}`,
            buyer_email: `buyer-${giftSequence}@example.com`,
            buyer_member_id: null,
            buyer_name: 'Gift Buyer',
            delivery_method: 'email',
            recipient_email: `recipient-${giftSequence}@example.com`,
            recipient_name: 'Gift Recipient',
            personal_message: 'Enjoy your gift!',
            deliver_at: null,
            delivery_status: 'pending',
            delivery_attempts: 0,
            delivery_attempt_at: null,
            email_sent_at: null,
            email_provider_message_id: null,
            delivery_outcome: 'unknown',
            delivery_outcome_at: null,
            delivery_outcome_error: null,
            redeemer_member_id: null,
            tier_id: paidTier.id,
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripe_checkout_session_id: `cs_delivery_api_${giftSequence}`,
            stripe_payment_intent_id: `pi_delivery_api_${giftSequence}`,
            consumes_at: null,
            expires_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            status: 'purchased',
            purchased_at: now,
            redeemed_at: null,
            consumed_at: null,
            expired_at: null,
            refunded_at: null,
            consumes_soon_reminder_sent_at: null
        });
    }

    it('claims, sends, and marks a pending delivery as sent', async function () {
        const gift = await createPendingEmailGift();

        await agent
            .put(`gifts/flush_deliveries/?token=${schedulerToken}`)
            .expectStatus(204)
            .expectEmptyBody()
            .expect(cacheInvalidateHeaderNotSet());
        await DomainEvents.allSettled();

        emailMockReceiver.assertSentEmailCount(1);
        assert.equal(emailMockReceiver.getSentEmail(0).to, gift.get('recipient_email'));

        const reloaded = await models.Gift.findOne({token: gift.get('token')}, {require: true});
        assert.equal(reloaded.get('delivery_status'), 'sent');
        assert.equal(reloaded.get('delivery_attempts'), 1);
        assert.ok(reloaded.get('email_sent_at'));
    });
});
