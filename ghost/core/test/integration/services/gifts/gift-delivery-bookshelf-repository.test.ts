import assert from 'node:assert/strict';
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
        startedAt = null,
        giftStatus = 'purchased',
        purchasedAt = new Date()
    }: {
        startedAt?: Date | null;
        giftStatus?: string;
        purchasedAt?: Date;
    } = {}) {
        giftSequence += 1;
        const gift = await models.Gift.add({
            token: `delivery-start-test-token-${giftSequence}`,
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
            expires_at: new Date(purchasedAt.getTime() + 365 * 24 * 60 * 60 * 1000),
            status: giftStatus,
            purchased_at: purchasedAt,
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
            started_at: startedAt,
            email_sent_at: null,
            email_provider_message_id: null,
            outcome: 'unknown',
            outcome_at: null,
            outcome_error: null
        });

        return {gift, delivery};
    }

    it('decodes a link-delivered gift without creating a delivery row', async function () {
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

        assert.equal(decoded?.purchasedAt.toISOString(), new Date(gift.get('purchased_at')).toISOString());
        assert.equal(await deliveryRepository.getByGiftId(gift.id), null);
    });

    it('allows exactly one concurrent caller to start a pending delivery', async function () {
        const startedAt = new Date();
        startedAt.setMilliseconds(0);
        const {delivery} = await createPendingEmailGift();

        const starts = await Promise.all([
            deliveryRepository.tryStartDelivery(delivery.id, startedAt),
            deliveryRepository.tryStartDelivery(delivery.id, startedAt)
        ]);
        const reloaded = await deliveryRepository.getById(delivery.id);

        assert.equal(starts.filter(Boolean).length, 1);
        assert.equal(starts.filter(start => start === null).length, 1);
        assert.equal(reloaded?.status, 'sending');
        assert.equal(reloaded?.startedAt?.toISOString(), startedAt.toISOString());
    });

    it('does not complete a delivery that is not sending', async function () {
        const {delivery} = await createPendingEmailGift();

        assert.equal(await deliveryRepository.markSent(delivery.id, new Date(), 'provider-1'), false);
        assert.equal((await deliveryRepository.getById(delivery.id))?.status, 'pending');
    });

    it('does not start a delivery when the parent gift is no longer purchased', async function () {
        const startedAt = new Date();
        const {delivery} = await createPendingEmailGift({
            giftStatus: 'refunded'
        });

        assert.equal(await deliveryRepository.tryStartDelivery(delivery.id, startedAt), null);
    });

    it('cancels a pending delivery by gift token', async function () {
        const {gift, delivery} = await createPendingEmailGift();

        assert.equal(await deliveryRepository.cancelPendingForGift(gift.get('token')), true);
        assert.equal((await deliveryRepository.getById(delivery.id))?.status, 'cancelled');
    });

    it('only replaces provider outcomes with newer provider timestamps', async function () {
        const {delivery} = await createPendingEmailGift();
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
        }), 'stale');

        assert.equal(await deliveryRepository.recordOutcome({
            providerMessageId: 'unknown-provider',
            outcome: 'delivered',
            timestamp: new Date('2026-08-11T11:00:00.000Z'),
            error: null
        }), 'not_found');

        assert.equal(await deliveryRepository.recordOutcome({
            providerMessageId: 'provider-123',
            outcome: 'delivered',
            timestamp: new Date('2026-08-11T11:00:00.000Z'),
            error: null
        }), 'recorded');

        const reloaded = await deliveryRepository.getById(delivery.id);
        assert.equal(reloaded?.outcome, 'delivered');
        assert.equal(reloaded?.outcomeAt?.toISOString(), '2026-08-11T11:00:00.000Z');
        assert.equal(reloaded?.outcomeError, null);
        assert.equal((await deliveryRepository.getByProviderMessageId('provider-123'))?.id, delivery.id);
    });

});
