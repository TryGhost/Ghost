import assert from 'node:assert/strict';
import sinon from 'sinon';
import { GiftEmailAnalyticsBatchProcessor } from '../../../../../core/server/services/email-analytics/gift-email-analytics-batch-processor';
import { EventProcessingResult } from '../../../../../core/server/services/email-analytics/event-processing-result';

function safetyDeps() {
  return {
    emailSuppressionList: {
      handleBounce: sinon.stub().resolves(),
      handleComplaint: sinon.stub().resolves(),
      removeComplaint: sinon.stub().resolves(),
    },
  };
}

describe('GiftEmailAnalyticsBatchProcessor', function () {
  it('maps provider delivery and failure events to latest gift outcomes without opens', async function () {
    const giftDeliveryService = {
      getRecipientEmailForMessage: sinon.stub().resolves('reader@example.com'),
      recordOutcome: sinon.stub().resolves('recorded' as const),
    };
    const processor = new GiftEmailAnalyticsBatchProcessor({
      giftDeliveryService,
      ...safetyDeps(),
    });
    const result = new EventProcessingResult();
    const fetchData: { lastEventTimestamp?: Date } = {};
    const deliveredAt = new Date('2026-08-05T12:00:00.000Z');
    const failedAt = new Date('2026-08-05T12:10:00.000Z');

    await processor.processBatch(
      [
        {
          type: 'delivered',
          providerId: '<provider-123>',
          timestamp: deliveredAt,
          error: { code: 250, message: 'OK' },
        },
        {
          type: 'failed',
          severity: 'temporary',
          providerId: 'provider-123',
          timestamp: failedAt,
          error: { code: 421, message: 'try later' },
        },
        {
          type: 'opened',
          providerId: 'provider-123',
          timestamp: new Date('2026-08-05T12:20:00.000Z'),
        },
      ],
      result,
      fetchData,
    );

    sinon.assert.calledWithExactly(
      giftDeliveryService.recordOutcome,
      sinon.match({
        providerMessageId: '<provider-123>',
        outcome: 'delivered',
        timestamp: deliveredAt,
        error: null,
      }),
    );
    assert.deepEqual(giftDeliveryService.recordOutcome.secondCall.firstArg, {
      providerMessageId: 'provider-123',
      outcome: 'temporary_failed',
      timestamp: failedAt,
      error: JSON.stringify({ code: 421, message: 'try later' }),
    });
    assert.equal(result.delivered, 1);
    assert.equal(result.temporaryFailed, 1);
    assert.equal(result.ignored, 1);
    assert.equal(result.unhandled, 0);
  });

  it('treats failed events as temporary unless Mailgun marks them permanent', async function () {
    const giftDeliveryService = {
      getRecipientEmailForMessage: sinon.stub().resolves('reader@example.com'),
      recordOutcome: sinon.stub().resolves('recorded' as const),
    };
    const processor = new GiftEmailAnalyticsBatchProcessor({
      giftDeliveryService,
      ...safetyDeps(),
    });
    const result = new EventProcessingResult();

    await processor.processBatch(
      [
        {
          type: 'failed',
          providerId: 'missing-severity',
          timestamp: new Date('2026-08-05T12:00:00.000Z'),
        },
        {
          type: 'failed',
          // @ts-expect-error Exercise the runtime fallback for an invalid severity.
          severity: 'unexpected',
          providerId: 'unexpected-severity',
          timestamp: new Date('2026-08-05T12:01:00.000Z'),
        },
        {
          type: 'failed',
          severity: 'permanent',
          providerId: 'permanent',
          timestamp: new Date('2026-08-05T12:02:00.000Z'),
        },
      ],
      result,
      {},
    );

    assert.equal(giftDeliveryService.recordOutcome.firstCall.firstArg.outcome, 'temporary_failed');
    assert.equal(giftDeliveryService.recordOutcome.secondCall.firstArg.outcome, 'temporary_failed');
    assert.equal(giftDeliveryService.recordOutcome.thirdCall.firstArg.outcome, 'permanent_failed');
    assert.equal(result.temporaryFailed, 2);
    assert.equal(result.permanentFailed, 1);
  });

  it('marks events for unknown message IDs unprocessable', async function () {
    const giftDeliveryService = {
      getRecipientEmailForMessage: sinon.stub().resolves('reader@example.com'),
      recordOutcome: sinon.stub().resolves('not_found' as const),
    };
    const processor = new GiftEmailAnalyticsBatchProcessor({
      giftDeliveryService,
      ...safetyDeps(),
    });
    const result = new EventProcessingResult();

    await processor.processBatch(
      [{ type: 'failed', severity: 'permanent', providerId: 'unknown', timestamp: new Date() }],
      result,
      {},
    );

    assert.equal(result.unprocessable, 1);
    assert.equal(result.permanentFailed, 0);
  });

  it('counts stale events as processed without recording an ID mismatch', async function () {
    const giftDeliveryService = {
      getRecipientEmailForMessage: sinon.stub().resolves('reader@example.com'),
      recordOutcome: sinon.stub().resolves('stale' as const),
    };
    const processor = new GiftEmailAnalyticsBatchProcessor({
      giftDeliveryService,
      ...safetyDeps(),
    });
    const result = new EventProcessingResult();

    await processor.processBatch(
      [{ type: 'delivered', providerId: 'known', timestamp: new Date() }],
      result,
      {},
    );

    assert.equal(result.delivered, 1);
    assert.equal(result.unprocessable, 0);
  });
});

describe('gift safety events', () => {
  const event = {
    providerId: 'message',
    recipientEmail: 'reader@example.com',
    timestamp: new Date(),
    suppress: false,
  };
  it('suppresses complaints and stale qualifying failures while explicitly ignoring opens and unsubscribes', async () => {
    const giftDeliveryService = {
      getRecipientEmailForMessage: sinon.stub().resolves(event.recipientEmail),
      recordOutcome: sinon.stub().resolves('stale' as const),
    };
    const deps = safetyDeps();
    const processor = new GiftEmailAnalyticsBatchProcessor({ giftDeliveryService, ...deps });
    const result = new EventProcessingResult();
    const callback = { ...event, recipientEmail: event.recipientEmail.toUpperCase() };
    await processor.processBatch(
      [
        { ...callback, type: 'complained' },
        { ...callback, type: 'failed', severity: 'permanent', suppress: true },
        { ...event, type: 'unsubscribed' },
        { ...event, type: 'opened' },
      ],
      result,
      {},
    );
    sinon.assert.calledOnceWithMatch(deps.emailSuppressionList.handleComplaint, {
      email: event.recipientEmail,
    });
    sinon.assert.calledOnceWithMatch(deps.emailSuppressionList.handleBounce, {
      email: event.recipientEmail,
    });
    sinon.assert.calledOnceWithMatch(giftDeliveryService.recordOutcome, {
      providerMessageId: event.providerId,
      outcome: 'permanent_failed',
    });
    assert.equal(result.complained, 1);
    assert.equal(result.permanentFailed, 1);
    assert.equal(result.ignored, 2);
    giftDeliveryService.getRecipientEmailForMessage.resolves('other@example.com');
    await processor.processBatch([{ ...event, type: 'complained' }], result, {});
    assert.equal(result.unprocessable, 1);
    sinon.assert.calledOnce(deps.emailSuppressionList.handleComplaint);
  });
  it('propagates safety write and cleanup failures so callbacks can retry', async () => {
    const giftDeliveryService = {
      getRecipientEmailForMessage: sinon.stub().resolves(event.recipientEmail),
      recordOutcome: sinon.stub().resolves('recorded' as const),
    };
    const deps = safetyDeps();
    const processor = new GiftEmailAnalyticsBatchProcessor({ giftDeliveryService, ...deps });
    const result = new EventProcessingResult();
    deps.emailSuppressionList.handleBounce.rejects(new Error('local failure'));
    await assert.rejects(
      processor.processBatch(
        [{ ...event, type: 'failed', severity: 'permanent', suppress: true }],
        result,
        {},
      ),
      /local failure/,
    );
    sinon.assert.notCalled(giftDeliveryService.recordOutcome);
    deps.emailSuppressionList.removeComplaint.rejects(new Error('cleanup failure'));
    await assert.rejects(
      processor.processBatch([{ ...event, type: 'complained' }], result, {}),
      /cleanup failure/,
    );
    assert.equal(result.complained, 0);
  });
  it('reports a missing gift as unprocessable without suppressing an uncorrelated address', async () => {
    const giftDeliveryService = {
      getRecipientEmailForMessage: sinon.stub().resolves(null),
      recordOutcome: sinon.stub().resolves('recorded' as const),
    };
    const deps = safetyDeps();
    const processor = new GiftEmailAnalyticsBatchProcessor({ giftDeliveryService, ...deps });
    const result = new EventProcessingResult();
    await processor.processBatch([{ ...event, type: 'complained' }], result, {});
    assert.equal(result.unprocessable, 1);
    sinon.assert.notCalled(deps.emailSuppressionList.handleComplaint);
  });
});
