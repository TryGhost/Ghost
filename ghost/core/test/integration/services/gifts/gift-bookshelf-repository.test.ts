import assert from 'node:assert/strict';
import {GiftBookshelfRepository} from '../../../../core/server/services/gifts/gift-bookshelf-repository';

const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');

describe('GiftBookshelfRepository (integration)', function () {
    let repository: GiftBookshelfRepository;
    let paidTierId: string;
    let giftSequence = 0;

    beforeAll(async function () {
        await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');

        const paidTier = await models.Product.findOne({type: 'paid'}, {require: true});
        paidTierId = paidTier.id;
        repository = new GiftBookshelfRepository({GiftModel: models.Gift});
    });

    afterEach(async function () {
        await models.Gift.query().del();
    });

    async function createPendingEmailGift(overrides: Record<string, unknown> = {}) {
        giftSequence += 1;
        const now = new Date();

        return await models.Gift.add({
            token: `claim-test-token-${giftSequence}`,
            buyer_email: `buyer-${giftSequence}@example.com`,
            buyer_member_id: null,
            buyer_name: 'Gift Buyer',
            delivery_method: 'email',
            recipient_email: `recipient-${giftSequence}@example.com`,
            recipient_name: 'Gift Recipient',
            personal_message: null,
            deliver_at: null,
            delivery_status: 'pending',
            delivery_attempts: 0,
            delivery_attempt_at: null,
            email_sent_at: null,
            email_provider_message_id: null,
            delivery_outcome: 'unknown',
            delivery_outcome_at: null,
            delivery_outcome_diagnostics: null,
            redeemer_member_id: null,
            tier_id: paidTierId,
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripe_checkout_session_id: `cs_claim_${giftSequence}`,
            stripe_payment_intent_id: `pi_claim_${giftSequence}`,
            consumes_at: null,
            expires_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            status: 'purchased',
            purchased_at: now,
            redeemed_at: null,
            consumed_at: null,
            expired_at: null,
            refunded_at: null,
            consumes_soon_reminder_sent_at: null,
            ...overrides
        });
    }

    it('persists legacy link gifts with delivery defaults', async function () {
        giftSequence += 1;
        const now = new Date();

        const gift = await models.Gift.add({
            token: `legacy-link-token-${giftSequence}`,
            buyer_email: `legacy-buyer-${giftSequence}@example.com`,
            buyer_member_id: null,
            redeemer_member_id: null,
            tier_id: paidTierId,
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripe_checkout_session_id: `cs_legacy_${giftSequence}`,
            stripe_payment_intent_id: `pi_legacy_${giftSequence}`,
            consumes_at: null,
            expires_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            status: 'purchased',
            purchased_at: now,
            redeemed_at: null,
            consumed_at: null,
            expired_at: null,
            refunded_at: null
        });

        assert.equal(gift.get('delivery_method'), 'link');
        assert.equal(gift.get('delivery_status'), 'pending');
        assert.equal(gift.get('delivery_attempts'), 0);
        assert.equal(gift.get('delivery_outcome'), 'unknown');
    });

    it('allows exactly one concurrent caller to claim a due delivery', async function () {
        const claimAt = new Date();
        claimAt.setMilliseconds(0);
        const gift = await createPendingEmailGift({
            deliver_at: new Date(claimAt.getTime() - 60_000),
            delivery_attempt_at: new Date(claimAt.getTime() - 30_000)
        });

        const claims = await Promise.all([
            repository.claimPendingDelivery(gift.get('token'), claimAt, 10),
            repository.claimPendingDelivery(gift.get('token'), claimAt, 10)
        ]);
        const reloaded = await repository.getByToken(gift.get('token'));

        assert.equal(claims.filter(Boolean).length, 1);
        assert.equal(claims.filter(claim => claim === null).length, 1);

        assert.equal(reloaded?.deliveryStatus, 'sending');
        assert.equal(reloaded?.deliveryAttempts, 1);
        assert.equal(reloaded?.deliveryAttemptAt?.toISOString(), claimAt.toISOString());
    });

    it('does not claim a delivery before its delivery or retry time', async function () {
        const claimAt = new Date();
        claimAt.setMilliseconds(0);
        const futureDelivery = await createPendingEmailGift({
            deliver_at: new Date(claimAt.getTime() + 60_000)
        });
        const futureRetry = await createPendingEmailGift({
            delivery_attempt_at: new Date(claimAt.getTime() + 60_000)
        });

        const deliveryClaim = await repository.claimPendingDelivery(futureDelivery.get('token'), claimAt, 10);
        const retryClaim = await repository.claimPendingDelivery(futureRetry.get('token'), claimAt, 10);

        assert.equal(deliveryClaim, null);
        assert.equal(retryClaim, null);
        assert.equal((await repository.getByToken(futureDelivery.get('token')))?.deliveryAttempts, 0);
        assert.equal((await repository.getByToken(futureRetry.get('token')))?.deliveryAttempts, 0);
    });
});
