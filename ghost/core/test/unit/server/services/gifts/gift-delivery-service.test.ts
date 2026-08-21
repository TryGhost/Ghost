import assert from 'node:assert/strict';
import logging from '@tryghost/logging';
import sinon from 'sinon';
import type { Knex } from 'knex';
import { GiftDeliveryService } from '../../../../../core/server/services/gifts/gift-delivery-service';
import type { GiftDeliveryRepository } from '../../../../../core/server/services/gifts/gift-delivery-bookshelf-repository';
import { buildGift, buildGiftDelivery } from './utils';

const DomainEvents = require('@tryghost/domain-events');
const transacting = 'trx' as unknown as Knex.Transaction;

describe('GiftDeliveryService', function () {
  type GiftDeliveryRepositoryStub = {
    [K in keyof GiftDeliveryRepository]: sinon.SinonStub;
  };

  let giftRepository: {
    getById: sinon.SinonStub;
  };
  let giftDeliveryRepository: GiftDeliveryRepositoryStub;
  let giftEmailService: {
    sendGiftDelivery: sinon.SinonStub;
    sendDeliveryFailureNotification: sinon.SinonStub;
  };
  let giftEmailAnalytics: {
    schedule: sinon.SinonStub;
  };
  let dispatchDelivery: sinon.SinonStub;
  let tiersService: {
    api: {
      read: sinon.SinonStub;
    };
  };

  beforeEach(function () {
    giftRepository = {
      getById: sinon.stub().resolves(
        buildGift({
          recipientName: 'Recipient',
          buyerName: 'Buyer',
          personalMessage: 'Enjoy this gift',
        }),
      ),
    };
    giftDeliveryRepository = {
      getById: sinon.stub().resolves(null),
      getByGiftId: sinon.stub().resolves(null),
      getByProviderMessageId: sinon.stub().resolves(null),
      findRecoverableForPurchasedGifts: sinon.stub().resolves([]),
      tryStartDelivery: sinon.stub().resolves(buildGiftDelivery({ status: 'sending' })),
      markSent: sinon.stub().resolves(true),
      recordCancelledAcceptance: sinon.stub().resolves(false),
      markFailed: sinon.stub().resolves(true),
      markCancelled: sinon.stub().resolves(true),
      cancelPendingForGift: sinon.stub().resolves(false),
      recordOutcome: sinon.stub().resolves('recorded'),
      create: sinon.stub().resolves(undefined),
    };
    giftEmailService = {
      sendGiftDelivery: sinon.stub().resolves({ providerMessageId: 'provider-123' }),
      sendDeliveryFailureNotification: sinon.stub().resolves(undefined),
    };
    giftEmailAnalytics = {
      schedule: sinon.stub().resolves(undefined),
    };
    dispatchDelivery = sinon.stub(DomainEvents, 'dispatch');
    tiersService = {
      api: {
        read: sinon.stub().resolves({
          name: 'Bronze',
          toJSON: () => ({ benefits: ['Benefit 1', 'Benefit 2'] }),
        }),
      },
    };
  });

  function createService() {
    return new GiftDeliveryService({
      giftRepository,
      giftDeliveryRepository,
      tiersService,
      giftEmailService,
      giftEmailAnalytics,
    });
  }

  afterEach(function () {
    sinon.restore();
  });

  it('dispatches an immediate send for a pending delivery after purchase', async function () {
    giftDeliveryRepository.getByGiftId.resolves(
      buildGiftDelivery({ id: 'delivery_1', recipientEmail: 'recipient@example.com' }),
    );
    const service = createService();

    assert.equal(await service.dispatchForGift('gift_1'), 'recipient@example.com');
    assert.deepEqual(dispatchDelivery.firstCall.firstArg.data, { deliveryId: 'delivery_1' });
  });

  it('recovers pending deliveries for purchased gifts one at a time', async function () {
    giftDeliveryRepository.findRecoverableForPurchasedGifts.resolves([
      buildGiftDelivery({ id: 'delivery_1' }),
      buildGiftDelivery({ id: 'delivery_2' }),
      buildGiftDelivery({ id: 'delivery_3' }),
    ]);
    giftDeliveryRepository.tryStartDelivery
      .withArgs('delivery_1')
      .resolves(buildGiftDelivery({ id: 'delivery_1', status: 'sending' }))
      .withArgs('delivery_2')
      .resolves(buildGiftDelivery({ id: 'delivery_2', status: 'sending' }))
      .withArgs('delivery_3')
      .resolves(null);
    let inFlight = 0;
    let maxInFlight = 0;
    giftEmailService.sendGiftDelivery.callsFake(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
      inFlight -= 1;
      return { providerMessageId: 'provider-123' };
    });
    const service = createService();

    assert.deepEqual(await service.recoverPending(), {
      sentCount: 2,
      skippedCount: 1,
      failedCount: 0,
    });
    sinon.assert.calledOnceWithExactly(
      giftDeliveryRepository.findRecoverableForPurchasedGifts,
      sinon.match.date,
      1000,
    );
    sinon.assert.notCalled(dispatchDelivery);
    sinon.assert.calledTwice(giftEmailService.sendGiftDelivery);
    assert.equal(maxInFlight, 1);
    sinon.assert.calledWith(giftDeliveryRepository.markSent, 'delivery_1');
    sinon.assert.calledWith(giftDeliveryRepository.markSent, 'delivery_2');
  });

  it('keeps recovering remaining deliveries when one send throws', async function () {
    sinon.stub(logging, 'error');
    giftDeliveryRepository.findRecoverableForPurchasedGifts.resolves([
      buildGiftDelivery({ id: 'delivery_1' }),
      buildGiftDelivery({ id: 'delivery_2' }),
    ]);
    giftDeliveryRepository.tryStartDelivery
      .withArgs('delivery_1')
      .rejects(new Error('db down'))
      .withArgs('delivery_2')
      .resolves(buildGiftDelivery({ id: 'delivery_2', status: 'sending' }));
    const service = createService();

    assert.deepEqual(await service.recoverPending(), {
      sentCount: 1,
      skippedCount: 0,
      failedCount: 1,
    });
    sinon.assert.calledOnce(giftEmailService.sendGiftDelivery);
  });

  it('cancels a pending delivery within the gift lifecycle transaction', async function () {
    giftDeliveryRepository.cancelPendingForGift.resolves(true);
    const service = createService();

    assert.equal(await service.cancelPendingForGift('gift-token', { transacting }), true);
    sinon.assert.calledOnceWithExactly(giftDeliveryRepository.cancelPendingForGift, 'gift-token', {
      transacting,
    });
  });

  it('claims, sends, and records mail transport acceptance', async function () {
    const service = createService();

    const result = await service.send('delivery_1');

    assert.equal(result, 'sent');
    sinon.assert.calledOnceWithExactly(
      giftDeliveryRepository.tryStartDelivery,
      'delivery_1',
      sinon.match.date,
      sinon.match.date,
    );
    sinon.assert.calledOnceWithExactly(
      giftDeliveryRepository.markSent,
      'delivery_1',
      sinon.match.date,
      'provider-123',
    );
    sinon.assert.calledOnceWithExactly(
      giftEmailService.sendGiftDelivery,
      sinon.match({
        buyerEmail: 'buyer@example.com',
        buyerName: 'Buyer',
      }),
    );
    sinon.assert.calledOnce(giftEmailAnalytics.schedule);
  });

  it('records transport acceptance without a provider message ID', async function () {
    giftEmailService.sendGiftDelivery.resolves({ providerMessageId: null });
    const service = createService();

    assert.equal(await service.send('delivery_1'), 'sent');
    sinon.assert.calledOnceWithExactly(
      giftDeliveryRepository.markSent,
      'delivery_1',
      sinon.match.date,
      null,
    );
    sinon.assert.notCalled(giftEmailAnalytics.schedule);
  });

  it('leaves an accepted handoff in sending when the durable sent fact cannot be persisted', async function () {
    sinon.stub(logging, 'error');
    giftDeliveryRepository.markSent.resolves(false);
    const service = createService();

    assert.equal(await service.send('delivery_1'), 'failed');
    sinon.assert.notCalled(giftDeliveryRepository.markFailed);
  });

  it('records acceptance details on a delivery cancelled while its email was in flight', async function () {
    sinon.stub(logging, 'info');
    const errorLog = sinon.stub(logging, 'error');
    giftDeliveryRepository.markSent.resolves(false);
    giftDeliveryRepository.recordCancelledAcceptance.resolves(true);
    const service = createService();

    assert.equal(await service.send('delivery_1'), 'skipped');
    sinon.assert.calledOnceWithExactly(
      giftDeliveryRepository.recordCancelledAcceptance,
      'delivery_1',
      sinon.match.date,
      'provider-123',
    );
    sinon.assert.calledOnce(giftEmailAnalytics.schedule);
    sinon.assert.notCalled(giftDeliveryRepository.markFailed);
    sinon.assert.notCalled(errorLog);
  });

  it('retries accepted handoff persistence once', async function () {
    sinon.stub(logging, 'warn');
    giftDeliveryRepository.markSent.onFirstCall().rejects({ code: 'ECONNREFUSED' });
    giftDeliveryRepository.markSent.onSecondCall().resolves(true);
    const service = createService();

    assert.equal(await service.send('delivery_1'), 'sent');
    sinon.assert.calledTwice(giftDeliveryRepository.markSent);
    sinon.assert.notCalled(giftDeliveryRepository.markFailed);
  });

  it('moves an accepted handoff out of recovery when persistence retries fail', async function () {
    sinon.stub(logging, 'error');
    sinon.stub(logging, 'warn');
    giftDeliveryRepository.markSent.rejects({ code: 'ECONNREFUSED' });
    const service = createService();

    assert.equal(await service.send('delivery_1'), 'failed');
    sinon.assert.calledTwice(giftDeliveryRepository.markSent);
    sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
  });

  it('keeps an accepted delivery sent when analytics scheduling fails', async function () {
    giftEmailAnalytics.schedule.rejects(new Error('scheduler unavailable'));
    const service = createService();

    const result = await service.send('delivery_1');

    assert.equal(result, 'sent');
    sinon.assert.calledOnceWithExactly(
      giftDeliveryRepository.markSent,
      'delivery_1',
      sinon.match.date,
      'provider-123',
    );
  });

  it('does not send when another worker or lifecycle transition starts the delivery first', async function () {
    giftDeliveryRepository.tryStartDelivery.resolves(null);
    const service = createService();

    const result = await service.send('delivery_1');

    assert.equal(result, 'skipped');
    sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
  });

  it('fails a started delivery whose gift is missing', async function () {
    giftRepository.getById.resolves(null);
    const service = createService();

    const result = await service.send('delivery_1');

    assert.equal(result, 'failed');
    sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
    sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
  });

  it('fails a started email delivery without required buyer details', async function () {
    giftRepository.getById.resolves(
      buildGift({
        buyerEmail: null,
        buyerName: null,
      }),
    );
    const service = createService();

    const result = await service.send('delivery_1');

    assert.equal(result, 'failed');
    sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
    sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
  });

  it('cancels a started delivery when its gift is no longer purchased', async function () {
    giftRepository.getById.resolves(
      buildGift({
        status: 'refunded',
        refundedAt: new Date(),
      }),
    );
    const service = createService();

    const result = await service.send('delivery_1');

    assert.equal(result, 'skipped');
    sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markCancelled, 'delivery_1');
    sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
  });

  it('cancels a started delivery when the gift claim deadline has passed', async function () {
    giftRepository.getById.resolves(buildGift({ expiresAt: new Date(Date.now() - 1000) }));
    const service = createService();

    const result = await service.send('delivery_1');

    assert.equal(result, 'skipped');
    sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markCancelled, 'delivery_1');
    sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
  });

  it('fails a delivery when the mail transport does not accept it', async function () {
    sinon.stub(logging, 'error');
    giftEmailService.sendGiftDelivery.rejects(new Error('421 Try again later'));
    const service = createService();

    assert.equal(await service.send('delivery_1'), 'failed');
    sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
  });

  it('logs only the underlying error when the bulk mailer rejects with the rendered message', async function () {
    const errorLog = sinon.stub(logging, 'error');
    const transportError = new Error('Mailgun unavailable');
    giftEmailService.sendGiftDelivery.rejects({
      error: transportError,
      messageData: { html: '<p>secret link</p>' },
    });
    const service = createService();

    const result = await service.send('delivery_1');

    assert.equal(result, 'failed');
    sinon.assert.calledOnceWithExactly(
      errorLog,
      sinon.match({
        event: { name: 'gift_delivery.acceptance_failed' },
        err: transportError,
      }),
      sinon.match.string,
    );
    assert.equal(JSON.stringify(errorLog.firstCall.args).includes('secret link'), false);
  });

  const unusableTiers = [
    {
      name: 'cannot be read',
      arrange: (read: sinon.SinonStub) => read.rejects(new Error('tiers unavailable')),
    },
    { name: 'is missing', arrange: (read: sinon.SinonStub) => read.resolves(null) },
  ];

  for (const { name, arrange } of unusableTiers) {
    it(`fails a delivery when its tier ${name}`, async function () {
      sinon.stub(logging, 'error');
      arrange(tiersService.api.read);
      const service = createService();

      assert.equal(await service.send('delivery_1'), 'failed');
      sinon.assert.calledOnceWithExactly(giftDeliveryRepository.markFailed, 'delivery_1');
      sinon.assert.notCalled(giftEmailService.sendGiftDelivery);
    });
  }

  describe('recordOutcome', function () {
    const permanentFailure = {
      providerMessageId: 'provider-123',
      outcome: 'permanent_failed' as const,
      timestamp: new Date('2026-08-13T10:00:00.000Z'),
      error: 'recipient rejected',
    };

    it('sends the buyer the gift link after recording a permanent delivery failure', async function () {
      const delivery = buildGiftDelivery({ status: 'sent', outcome: 'permanent_failed' });
      const gift = buildGift();
      giftDeliveryRepository.getByProviderMessageId.resolves(delivery);
      giftRepository.getById.resolves(gift);
      const service = createService();

      assert.equal(await service.recordOutcome(permanentFailure), 'recorded');

      sinon.assert.calledOnceWithExactly(giftDeliveryRepository.recordOutcome, permanentFailure);
      sinon.assert.calledOnceWithExactly(
        giftDeliveryRepository.getByProviderMessageId,
        'provider-123',
      );
      sinon.assert.calledOnceWithExactly(giftEmailService.sendDeliveryFailureNotification, {
        buyerEmail: gift.buyerEmail,
        recipientEmail: delivery.recipientEmail,
        token: gift.token,
        expiresAt: gift.expiresAt,
      });
    });

    it('does not notify again when the provider outcome was not newly recorded', async function () {
      giftDeliveryRepository.recordOutcome.resolves('stale');
      const service = createService();

      assert.equal(await service.recordOutcome(permanentFailure), 'stale');

      sinon.assert.notCalled(giftDeliveryRepository.getByProviderMessageId);
      sinon.assert.notCalled(giftEmailService.sendDeliveryFailureNotification);
    });

    it('does not notify the buyer for temporary provider failures', async function () {
      const service = createService();

      await service.recordOutcome({ ...permanentFailure, outcome: 'temporary_failed' });

      sinon.assert.notCalled(giftDeliveryRepository.getByProviderMessageId);
      sinon.assert.notCalled(giftEmailService.sendDeliveryFailureNotification);
    });

    it('does not notify for a gift that can no longer be redeemed', async function () {
      giftDeliveryRepository.getByProviderMessageId.resolves(buildGiftDelivery());
      giftRepository.getById.resolves(
        buildGift({
          status: 'refunded',
          refundedAt: new Date(),
        }),
      );
      const warn = sinon.stub(logging, 'warn');
      const service = createService();

      await service.recordOutcome(permanentFailure);

      sinon.assert.notCalled(giftEmailService.sendDeliveryFailureNotification);
      sinon.assert.calledOnce(warn);
      sinon.assert.match(warn.firstCall.firstArg, {
        event: { name: 'gift_delivery.failure_notification.skipped' },
        reason: 'gift_not_redeemable',
      });
    });

    it('logs and ignores a buyer notification failure', async function () {
      giftDeliveryRepository.getByProviderMessageId.resolves(buildGiftDelivery());
      giftRepository.getById.resolves(buildGift());
      giftEmailService.sendDeliveryFailureNotification.rejects({ responseCode: 550 });
      const service = createService();

      assert.equal(await service.recordOutcome(permanentFailure), 'recorded');
    });
  });
});
