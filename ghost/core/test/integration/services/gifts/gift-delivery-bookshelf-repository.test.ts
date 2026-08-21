import assert from 'node:assert/strict';
import { GiftBookshelfRepository } from '../../../../core/server/services/gifts/gift-bookshelf-repository';
import { GiftDeliveryBookshelfRepository } from '../../../../core/server/services/gifts/gift-delivery-bookshelf-repository';

const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');

describe('GiftDeliveryBookshelfRepository (integration)', function () {
  let giftRepository: GiftBookshelfRepository;
  let deliveryRepository: GiftDeliveryBookshelfRepository;
  let paidTierId: string;
  let giftSequence = 0;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters');

    const paidTier = await models.Product.findOne({ type: 'paid' }, { require: true });
    paidTierId = paidTier.id;
    giftRepository = new GiftBookshelfRepository({
      GiftModel: models.Gift,
      knex: models.Base.knex,
    });
    deliveryRepository = new GiftDeliveryBookshelfRepository({
      GiftDeliveryModel: models.GiftDelivery,
      knex: models.Base.knex,
    });
  });

  afterEach(async function () {
    await models.GiftDelivery.query().del();
    await models.Gift.query().del();
  });

  async function createPendingEmailGift({
    startedAt = null,
    deliveryStatus = 'pending',
    giftStatus = 'purchased',
    purchasedAt = new Date(),
  }: {
    startedAt?: Date | null;
    deliveryStatus?: string;
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
      checkout_started_at: purchasedAt,
      consumes_at: null,
      expires_at: new Date(purchasedAt.getTime() + 365 * 24 * 60 * 60 * 1000),
      status: giftStatus,
      purchased_at: purchasedAt,
      redeemed_at: null,
      consumed_at: null,
      expired_at: null,
      refunded_at: null,
      consumes_soon_reminder_sent_at: null,
    });
    const delivery = await models.GiftDelivery.add({
      gift_id: gift.id,
      recipient_email: `recipient-${giftSequence}@example.com`,
      status: deliveryStatus,
      started_at: startedAt,
      email_sent_at: null,
      email_provider_message_id: null,
      outcome: 'unknown',
      outcome_at: null,
      outcome_error: null,
    });

    return { gift, delivery };
  }

  async function createAbandonedCheckout(checkoutStartedAt: Date) {
    giftSequence += 1;
    const gift = await models.Gift.add({
      token: `pending-cleanup-${giftSequence}`,
      buyer_email: `buyer-${giftSequence}@example.com`,
      buyer_name: 'Gift Buyer',
      recipient_name: 'Gift Recipient',
      personal_message: 'Private message',
      tier_id: paidTierId,
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 5000,
      stripe_checkout_session_id: `cs_pending_${giftSequence}`,
      stripe_payment_intent_id: null,
      checkout_started_at: checkoutStartedAt,
      expires_at: null,
      status: 'payment_pending',
      purchased_at: null,
    });
    const delivery = await models.GiftDelivery.add({
      gift_id: gift.id,
      recipient_email: `recipient-${giftSequence}@example.com`,
      status: 'pending',
    });

    return { gift, delivery };
  }

  it('allows exactly one concurrent caller to start a pending delivery', async function () {
    const startedAt = new Date();
    startedAt.setMilliseconds(0);
    const { delivery } = await createPendingEmailGift();

    const starts = await Promise.all([
      deliveryRepository.tryStartDelivery(
        delivery.id,
        startedAt,
        new Date(startedAt.getTime() - 60 * 60 * 1000),
      ),
      deliveryRepository.tryStartDelivery(
        delivery.id,
        startedAt,
        new Date(startedAt.getTime() - 60 * 60 * 1000),
      ),
    ]);
    const reloaded = await deliveryRepository.getById(delivery.id);

    assert.equal(starts.filter(Boolean).length, 1);
    assert.equal(starts.filter((start) => start === null).length, 1);
    assert.equal(reloaded?.status, 'sending');
    assert.equal(reloaded?.startedAt?.toISOString(), startedAt.toISOString());
  });

  it('does not complete a delivery that is not sending', async function () {
    const { delivery } = await createPendingEmailGift();

    assert.equal(await deliveryRepository.markSent(delivery.id, new Date(), 'provider-1'), false);
    assert.equal((await deliveryRepository.getById(delivery.id))?.status, 'pending');
  });

  it('records acceptance details only on a cancelled delivery', async function () {
    const sentAt = new Date('2026-08-18T10:00:00.000Z');
    const cancelled = await createPendingEmailGift({ deliveryStatus: 'cancelled' });
    const sending = await createPendingEmailGift({
      deliveryStatus: 'sending',
      startedAt: new Date(),
    });

    assert.equal(
      await deliveryRepository.recordCancelledAcceptance(
        cancelled.delivery.id,
        sentAt,
        'provider-1',
      ),
      true,
    );
    assert.equal(
      await deliveryRepository.recordCancelledAcceptance(sending.delivery.id, sentAt, 'provider-2'),
      false,
    );

    const cancelledReloaded = await deliveryRepository.getById(cancelled.delivery.id);
    assert.equal(cancelledReloaded?.status, 'cancelled');
    assert.equal(cancelledReloaded?.emailProviderMessageId, 'provider-1');
    assert.equal(cancelledReloaded?.emailSentAt?.toISOString(), sentAt.toISOString());

    const sendingReloaded = await deliveryRepository.getById(sending.delivery.id);
    assert.equal(sendingReloaded?.status, 'sending');
    assert.equal(sendingReloaded?.emailProviderMessageId, null);
  });

  it('does not start a delivery when the parent gift is no longer purchased', async function () {
    const startedAt = new Date();
    const { delivery } = await createPendingEmailGift({
      giftStatus: 'refunded',
    });

    assert.equal(
      await deliveryRepository.tryStartDelivery(
        delivery.id,
        startedAt,
        new Date(startedAt.getTime() - 60 * 60 * 1000),
      ),
      null,
    );
  });

  it('finds pending and stale sending deliveries only for purchased gifts', async function () {
    const now = new Date('2026-08-18T12:00:00.000Z');
    const staleBefore = new Date('2026-08-18T11:00:00.000Z');
    const purchased = await createPendingEmailGift();
    await createPendingEmailGift({ giftStatus: 'payment_pending' });
    const stale = await createPendingEmailGift({
      deliveryStatus: 'sending',
      startedAt: new Date('2026-08-18T10:00:00.000Z'),
    });
    await createPendingEmailGift({
      deliveryStatus: 'sending',
      startedAt: now,
    });

    const deliveries = await deliveryRepository.findRecoverableForPurchasedGifts(staleBefore, 100);

    assert.deepEqual(
      new Set(deliveries.map((delivery) => delivery.id)),
      new Set([purchased.delivery.id, stale.delivery.id]),
    );
  });

  it('allows exactly one concurrent caller to reclaim a stale sending delivery', async function () {
    const now = new Date('2026-08-18T12:00:00.000Z');
    const staleBefore = new Date('2026-08-18T11:00:00.000Z');
    const { delivery } = await createPendingEmailGift({
      deliveryStatus: 'sending',
      startedAt: new Date('2026-08-18T10:00:00.000Z'),
    });

    const starts = await Promise.all([
      deliveryRepository.tryStartDelivery(delivery.id, now, staleBefore),
      deliveryRepository.tryStartDelivery(delivery.id, now, staleBefore),
    ]);

    assert.equal(starts.filter(Boolean).length, 1);
    assert.equal(starts.filter((start) => start === null).length, 1);
    assert.equal(
      (await deliveryRepository.getById(delivery.id))?.startedAt?.toISOString(),
      now.toISOString(),
    );
  });

  it('deletes abandoned pending checkouts with their delivery PII', async function () {
    const checkoutStartedAt = new Date('2026-06-01T00:00:00.000Z');
    const checkouts = await Promise.all([
      createAbandonedCheckout(checkoutStartedAt),
      createAbandonedCheckout(checkoutStartedAt),
    ]);
    const cutoff = new Date('2026-07-01T00:00:00.000Z');

    assert.equal(await giftRepository.deleteAbandonedCheckouts(cutoff), 2);
    for (const { gift, delivery } of checkouts) {
      assert.equal(await models.Gift.findOne({ id: gift.id }, { require: false }), null);
      assert.equal(
        await models.GiftDelivery.findOne({ id: delivery.id }, { require: false }),
        null,
      );
    }
  });

  for (const deliveryStatus of ['pending', 'sending']) {
    it(`cancels a ${deliveryStatus} delivery by gift token`, async function () {
      const { gift, delivery } = await createPendingEmailGift({
        deliveryStatus,
        startedAt: deliveryStatus === 'sending' ? new Date() : null,
      });

      assert.equal(await deliveryRepository.cancelPendingForGift(gift.get('token')), true);
      assert.equal((await deliveryRepository.getById(delivery.id))?.status, 'cancelled');
    });
  }

  it('only replaces provider outcomes with newer provider timestamps', async function () {
    const { delivery } = await createPendingEmailGift();
    await delivery.save(
      {
        email_provider_message_id: 'provider-123',
        outcome: 'temporary_failed',
        outcome_at: new Date('2026-08-11T10:00:00.000Z'),
        outcome_error: 'temporary rejection',
      },
      { patch: true },
    );

    assert.equal(
      await deliveryRepository.recordOutcome({
        providerMessageId: 'provider-123',
        outcome: 'delivered',
        timestamp: new Date('2026-08-11T09:00:00.000Z'),
        error: null,
      }),
      'stale',
    );

    assert.equal(
      await deliveryRepository.recordOutcome({
        providerMessageId: 'unknown-provider',
        outcome: 'delivered',
        timestamp: new Date('2026-08-11T11:00:00.000Z'),
        error: null,
      }),
      'not_found',
    );

    assert.equal(
      await deliveryRepository.recordOutcome({
        providerMessageId: 'provider-123',
        outcome: 'delivered',
        timestamp: new Date('2026-08-11T11:00:00.000Z'),
        error: null,
      }),
      'recorded',
    );

    const reloaded = await deliveryRepository.getById(delivery.id);
    assert.equal(reloaded?.outcome, 'delivered');
    assert.equal(reloaded?.outcomeAt?.toISOString(), '2026-08-11T11:00:00.000Z');
    assert.equal(reloaded?.outcomeError, null);
    assert.equal(
      (await deliveryRepository.getByProviderMessageId('provider-123'))?.id,
      delivery.id,
    );
  });

  it('advances outcomes within the same database second without replaying them', async function () {
    const { delivery } = await createPendingEmailGift();
    await delivery.save({ email_provider_message_id: 'provider-123' }, { patch: true });

    assert.equal(
      await deliveryRepository.recordOutcome({
        providerMessageId: 'provider-123',
        outcome: 'temporary_failed',
        timestamp: new Date('2026-08-11T10:00:00.300Z'),
        error: 'temporary rejection',
      }),
      'recorded',
    );

    const permanentFailure = {
      providerMessageId: 'provider-123',
      outcome: 'permanent_failed' as const,
      timestamp: new Date('2026-08-11T10:00:00.900Z'),
      error: 'permanent rejection',
    };
    assert.equal(await deliveryRepository.recordOutcome(permanentFailure), 'recorded');
    assert.equal(await deliveryRepository.recordOutcome(permanentFailure), 'stale');

    const reloaded = await deliveryRepository.getById(delivery.id);
    assert.equal(reloaded?.outcome, 'permanent_failed');
    assert.equal(reloaded?.outcomeAt?.toISOString(), '2026-08-11T10:00:00.000Z');
    assert.equal(reloaded?.outcomeError, 'permanent rejection');
  });

  it('keeps permanent provider failures terminal across later events', async function () {
    const { delivery } = await createPendingEmailGift();
    await delivery.save({ email_provider_message_id: 'provider-123' }, { patch: true });

    assert.equal(
      await deliveryRepository.recordOutcome({
        providerMessageId: 'provider-123',
        outcome: 'permanent_failed',
        timestamp: new Date('2026-08-11T10:00:00.000Z'),
        error: 'permanent rejection',
      }),
      'recorded',
    );

    for (const outcome of ['delivered', 'temporary_failed', 'permanent_failed'] as const) {
      assert.equal(
        await deliveryRepository.recordOutcome({
          providerMessageId: 'provider-123',
          outcome,
          timestamp: new Date('2026-08-11T10:00:01.000Z'),
          error: outcome === 'delivered' ? null : 'later rejection',
        }),
        'stale',
      );
    }

    const reloaded = await deliveryRepository.getById(delivery.id);
    assert.equal(reloaded?.outcome, 'permanent_failed');
    assert.equal(reloaded?.outcomeAt?.toISOString(), '2026-08-11T10:00:00.000Z');
    assert.equal(reloaded?.outcomeError, 'permanent rejection');
  });
});
