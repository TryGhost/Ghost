import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';
import {GiftBookshelfRepository} from '../../../../core/server/services/gifts/gift-bookshelf-repository';
import {GiftDeliveryBookshelfRepository} from '../../../../core/server/services/gifts/gift-delivery-bookshelf-repository';

const {agentProvider, fixtureManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');

describe('GiftDeliveryBookshelfRepository (integration)', function () {
    let giftRepository: GiftBookshelfRepository;
    let deliveryRepository: GiftDeliveryBookshelfRepository;
    let paidTierId: string;
    let giftSequence = 0;

    beforeAll(async function () {
        await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');

        const paidTier = await models.Product.findOne({type: 'paid'}, {require: true});
        paidTierId = paidTier.id;
        giftRepository = new GiftBookshelfRepository({GiftModel: models.Gift});
        deliveryRepository = new GiftDeliveryBookshelfRepository({GiftDeliveryModel: models.GiftDelivery});
    });

    afterEach(async function () {
        await models.GiftDelivery.query().del();
        await models.Gift.query().del();
    });

    async function createPendingEmailGift({
        availableAt,
        attemptAt = null,
        giftStatus = 'purchased'
    }: {
        availableAt: Date;
        attemptAt?: Date | null;
        giftStatus?: string;
    }) {
        giftSequence += 1;
        const now = new Date();
        const gift = await models.Gift.add({
            token: `delivery-attempt-test-token-${giftSequence}`,
            buyer_email: `buyer-${giftSequence}@example.com`,
            buyer_member_id: null,
            buyer_name: 'Gift Buyer',
            recipient_name: 'Gift Recipient',
            personal_message: null,
            redeemer_member_id: null,
            tier_id: paidTierId,
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripe_checkout_session_id: `cs_claim_${giftSequence}`,
            stripe_payment_intent_id: `pi_claim_${giftSequence}`,
            consumes_at: null,
            available_at: availableAt,
            expires_at: new Date(availableAt.getTime() + 365 * 24 * 60 * 60 * 1000),
            status: giftStatus,
            purchased_at: now,
            redeemed_at: null,
            consumed_at: null,
            expired_at: null,
            refunded_at: null,
            consumes_soon_reminder_sent_at: null
        });
        const delivery = await models.GiftDelivery.add({
            id: new ObjectID().toHexString(),
            gift_id: gift.id,
            recipient_email: `recipient-${giftSequence}@example.com`,
            status: 'pending',
            attempts: 0,
            attempt_at: attemptAt,
            email_sent_at: null,
            email_provider_message_id: null,
            outcome: 'unknown',
            outcome_at: null,
            outcome_error: null
        });

        return {gift, delivery};
    }

    it('treats legacy gifts without availability as immediately available and link-delivered', async function () {
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

        const decoded = await giftRepository.getByToken(gift.get('token'));

        assert.equal(decoded?.availableAt.toISOString(), new Date(gift.get('purchased_at')).toISOString());
        assert.equal(await deliveryRepository.getByGiftId(gift.id), null);
    });

    it('allows exactly one concurrent caller to start a due delivery attempt', async function () {
        const attemptAt = new Date();
        attemptAt.setMilliseconds(0);
        const {delivery} = await createPendingEmailGift({
            availableAt: new Date(attemptAt.getTime() - 60_000),
            attemptAt: new Date(attemptAt.getTime() - 30_000)
        });

        const attempts = await Promise.all([
            deliveryRepository.tryStartAttempt(delivery.id, attemptAt, 10),
            deliveryRepository.tryStartAttempt(delivery.id, attemptAt, 10)
        ]);
        const reloaded = await deliveryRepository.getById(delivery.id);

        assert.equal(attempts.filter(Boolean).length, 1);
        assert.equal(attempts.filter(attempt => attempt === null).length, 1);
        assert.equal(reloaded?.status, 'sending');
        assert.equal(reloaded?.attempts, 1);
        assert.equal(reloaded?.attemptAt?.toISOString(), attemptAt.toISOString());
    });

    it('does not start an attempt before gift availability or the retry time', async function () {
        const attemptAt = new Date();
        attemptAt.setMilliseconds(0);
        const futureAvailability = await createPendingEmailGift({
            availableAt: new Date(attemptAt.getTime() + 60_000)
        });
        const futureRetry = await createPendingEmailGift({
            availableAt: new Date(attemptAt.getTime() - 60_000),
            attemptAt: new Date(attemptAt.getTime() + 60_000)
        });

        assert.equal(await deliveryRepository.tryStartAttempt(futureAvailability.delivery.id, attemptAt, 10), null);
        assert.equal(await deliveryRepository.tryStartAttempt(futureRetry.delivery.id, attemptAt, 10), null);
        assert.equal((await deliveryRepository.getById(futureAvailability.delivery.id))?.attempts, 0);
        assert.equal((await deliveryRepository.getById(futureRetry.delivery.id))?.attempts, 0);
    });

    it('does not start an attempt when the parent gift is no longer purchased', async function () {
        const attemptAt = new Date();
        const {delivery} = await createPendingEmailGift({
            availableAt: new Date(attemptAt.getTime() - 60_000),
            giftStatus: 'refunded'
        });

        assert.equal(await deliveryRepository.tryStartAttempt(delivery.id, attemptAt, 10), null);
    });

    it('cancels a pending delivery by gift token', async function () {
        const {gift, delivery} = await createPendingEmailGift({availableAt: new Date()});

        assert.equal(await deliveryRepository.cancelPendingForGift(gift.get('token')), true);
        assert.equal((await deliveryRepository.getById(delivery.id))?.status, 'cancelled');
    });

    it('only replaces provider outcomes with newer provider timestamps', async function () {
        const {delivery} = await createPendingEmailGift({availableAt: new Date()});
        await delivery.save({
            email_provider_message_id: 'provider-123',
            outcome: 'temporary_failed',
            outcome_at: new Date('2026-08-11T10:00:00.000Z'),
            outcome_error: 'temporary rejection'
        }, {patch: true});

        assert.equal(await deliveryRepository.recordOutcome({
            providerMessageId: 'provider-123',
            outcome: 'delivered',
            timestamp: new Date('2026-08-11T09:00:00.000Z'),
            error: null
        }), false);

        assert.equal(await deliveryRepository.recordOutcome({
            providerMessageId: 'provider-123',
            outcome: 'delivered',
            timestamp: new Date('2026-08-11T11:00:00.000Z'),
            error: null
        }), true);

        const reloaded = await deliveryRepository.getById(delivery.id);
        assert.equal(reloaded?.outcome, 'delivered');
        assert.equal(reloaded?.outcomeAt?.toISOString(), '2026-08-11T11:00:00.000Z');
        assert.equal(reloaded?.outcomeError, null);
    });
});
