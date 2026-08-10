import assert from 'node:assert/strict';
import sinon from 'sinon';
import {GiftEmailAnalyticsBatchProcessor} from '../../../../../core/server/services/email-analytics/gift-email-analytics-batch-processor';
import {EventProcessingResult} from '../../../../../core/server/services/email-analytics/event-processing-result';

describe('GiftEmailAnalyticsBatchProcessor', function () {
    it('maps Mailgun delivery and failure events to latest gift outcomes without opens', async function () {
        const giftService = {recordDeliveryOutcome: sinon.stub().resolves(true)};
        const processor = new GiftEmailAnalyticsBatchProcessor({giftService});
        const result = new EventProcessingResult();
        const fetchData: {lastEventTimestamp?: Date} = {};
        const deliveredAt = new Date('2026-08-05T12:00:00.000Z');
        const failedAt = new Date('2026-08-05T12:10:00.000Z');

        await processor.processBatch([
            {type: 'delivered', providerId: '<provider-123>', timestamp: deliveredAt},
            {type: 'failed', severity: 'temporary', providerId: 'provider-123', timestamp: failedAt, error: {code: 421, message: 'try later'}},
            {type: 'opened', providerId: 'provider-123', timestamp: new Date('2026-08-05T12:20:00.000Z')}
        ], result, fetchData);

        sinon.assert.calledWithExactly(giftService.recordDeliveryOutcome, sinon.match({
            providerMessageId: 'provider-123',
            outcome: 'delivered',
            timestamp: deliveredAt,
            error: null
        }));
        assert.deepEqual(giftService.recordDeliveryOutcome.secondCall.firstArg, {
            providerMessageId: 'provider-123',
            outcome: 'temporary_failed',
            timestamp: failedAt,
            error: JSON.stringify({code: 421, message: 'try later'})
        });
        assert.equal(result.delivered, 1);
        assert.equal(result.temporaryFailed, 1);
        assert.equal(result.unhandled, 1);
    });

    it('marks events for unknown message IDs unprocessable', async function () {
        const giftService = {recordDeliveryOutcome: sinon.stub().resolves(false)};
        const processor = new GiftEmailAnalyticsBatchProcessor({giftService});
        const result = new EventProcessingResult();

        await processor.processBatch([
            {type: 'failed', severity: 'permanent', providerId: 'unknown', timestamp: new Date()}
        ], result, {});

        assert.equal(result.unprocessable, 1);
        assert.equal(result.permanentFailed, 0);
    });
});
