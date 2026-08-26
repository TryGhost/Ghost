import { normalizeMailgunMessageId } from '../lib/mailgun-message-id';
import type { BatchEventProcessor } from './batch-event-processor';
import { EventProcessingResult } from './event-processing-result';

type GiftDeliveryService = {
  recordOutcome(data: {
    providerMessageId: string;
    outcome: 'delivered' | 'temporary_failed' | 'permanent_failed';
    timestamp: Date;
    error: string | null;
  }): Promise<'recorded' | 'stale' | 'not_found'>;
};

type EmailAnalyticsEvent = {
  type: string;
  severity?: string;
  providerId: string;
  timestamp: Date;
  error?: { code?: unknown; message?: unknown; enhancedCode?: unknown } | null;
};

export class GiftEmailAnalyticsBatchProcessor implements BatchEventProcessor {
  readonly #giftDeliveryService: GiftDeliveryService;

  constructor({ giftDeliveryService }: { giftDeliveryService: GiftDeliveryService }) {
    this.#giftDeliveryService = giftDeliveryService;
  }

  async processBatch(
    events: ReadonlyArray<EmailAnalyticsEvent>,
    result: EventProcessingResult,
    fetchData: { lastEventTimestamp?: Date },
  ): Promise<void> {
    for (const event of events) {
      if (!fetchData.lastEventTimestamp || event.timestamp > fetchData.lastEventTimestamp) {
        fetchData.lastEventTimestamp = event.timestamp;
      }

      let outcome: 'delivered' | 'temporary_failed' | 'permanent_failed' | null = null;
      if (event.type === 'delivered') {
        outcome = 'delivered';
      } else if (event.type === 'failed') {
        outcome = event.severity === 'permanent' ? 'permanent_failed' : 'temporary_failed';
      }

      if (!outcome) {
        result.merge(new EventProcessingResult({ unhandled: 1 }));
        continue;
      }

      const recordResult = await this.#giftDeliveryService.recordOutcome({
        providerMessageId: normalizeMailgunMessageId(event.providerId),
        outcome,
        timestamp: event.timestamp,
        error: outcome !== 'delivered' && event.error ? JSON.stringify(event.error) : null,
      });

      if (recordResult === 'not_found') {
        result.merge(new EventProcessingResult({ unprocessable: 1 }));
      } else if (outcome === 'delivered') {
        result.merge(new EventProcessingResult({ delivered: 1 }));
      } else if (outcome === 'temporary_failed') {
        result.merge(new EventProcessingResult({ temporaryFailed: 1 }));
      } else {
        result.merge(new EventProcessingResult({ permanentFailed: 1 }));
      }
    }
  }
}
