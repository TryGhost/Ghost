import assert from 'node:assert/strict';
import sinon from 'sinon';
import { SendGiftDeliveryEvent } from '../../../../core/server/services/gifts/events/send-gift-delivery-event';

const DomainEvents = require('@tryghost/domain-events');
const MailgunClient = require('../../../../core/server/services/lib/mailgun-client');
const models = require('../../../../core/server/models');
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');

describe('Gift delivery processing', function () {
  let paidTierId: string;
  let deliverySend: sinon.SinonStub;
  let giftSequence = 0;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters');

    const paidTier = await models.Product.findOne({ type: 'paid' }, { require: true });
    paidTierId = paidTier.id;
  });

  beforeEach(function () {
    sinon.stub(MailgunClient.prototype, 'isConfigured').returns(true);
    deliverySend = sinon.stub(MailgunClient.prototype, 'send').resolves({ id: '<provider-123>' });
  });

  afterEach(async function () {
    await DomainEvents.allSettled();
    await models.GiftDelivery.query().del();
    await models.Gift.query().del();
    sinon.restore();
  });

  async function createPendingEmailGift() {
    giftSequence += 1;
    const now = new Date();

    const gift = await models.Gift.add({
      token: `delivery-processing-token-${giftSequence}`,
      buyer_email: `buyer-${giftSequence}@example.com`,
      buyer_member_id: null,
      buyer_name: 'Gift Buyer',
      recipient_name: 'Gift Recipient',
      personal_message: 'Enjoy your gift!',
      redeemer_member_id: null,
      tier_id: paidTierId,
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 5000,
      stripe_checkout_session_id: `cs_delivery_processing_${giftSequence}`,
      stripe_payment_intent_id: `pi_delivery_processing_${giftSequence}`,
      consumes_at: null,
      expires_at: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      status: 'purchased',
      purchased_at: now,
      redeemed_at: null,
      consumed_at: null,
      expired_at: null,
      refunded_at: null,
      consumes_soon_reminder_sent_at: null,
    });
    const delivery = await models.GiftDelivery.add({
      gift_id: gift.id,
      recipient_email: `recipient-${giftSequence}@example.com`,
      status: 'pending',
      started_at: null,
      email_sent_at: null,
      email_provider_message_id: null,
      outcome: 'unknown',
      outcome_at: null,
      outcome_error: null,
    });

    return { gift, delivery };
  }

  it('claims, sends, and marks only the requested delivery as sent', async function () {
    const requested = await createPendingEmailGift();
    const untouched = await createPendingEmailGift();

    DomainEvents.dispatch(SendGiftDeliveryEvent.create({ deliveryId: requested.delivery.id }));
    await DomainEvents.allSettled();

    sinon.assert.calledOnce(deliverySend);
    assert.deepEqual(deliverySend.firstCall.args[1], {
      [requested.delivery.get('recipient_email')]: {},
    });

    const requestedReloaded = await models.GiftDelivery.findOne(
      { gift_id: requested.gift.id },
      { require: true },
    );
    assert.equal(requestedReloaded.get('status'), 'sent');
    assert.equal(requestedReloaded.get('started_at'), null);
    assert.ok(requestedReloaded.get('email_sent_at'));

    const untouchedReloaded = await models.GiftDelivery.findOne(
      { gift_id: untouched.gift.id },
      { require: true },
    );
    assert.equal(untouchedReloaded.get('status'), 'pending');
    assert.equal(untouchedReloaded.get('started_at'), null);
  });

  it('keeps acceptance details on a delivery cancelled while its email was in flight', async function () {
    const { gift, delivery } = await createPendingEmailGift();
    deliverySend.callsFake(async () => {
      // e.g. the gift is redeemed via the shared link before the email is accepted
      await models.GiftDelivery.query()
        .where({ id: delivery.id })
        .update({ status: 'cancelled', started_at: null });
      return { id: '<provider-123>' };
    });

    DomainEvents.dispatch(SendGiftDeliveryEvent.create({ deliveryId: delivery.id }));
    await DomainEvents.allSettled();

    sinon.assert.calledOnce(deliverySend);
    const reloaded = await models.GiftDelivery.findOne({ gift_id: gift.id }, { require: true });
    assert.equal(reloaded.get('status'), 'cancelled');
    assert.equal(reloaded.get('email_provider_message_id'), 'provider-123');
    assert.ok(reloaded.get('email_sent_at'));
  });
});
