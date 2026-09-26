import type { EmailEvent } from '@tryghost/adapter-base-email';
// @ts-expect-error This module lacks type definitions.
import type EmailSuppressionList from '../email-suppression-list';
import type { GiftDeliveryService } from '../gifts/gift-delivery-service';
import type { BatchEventProcessor } from './batch-event-processor';
import { EventProcessingResult } from './event-processing-result';

type EmailAnalyticsEvent = Pick<EmailEvent, 'type' | 'providerId' | 'timestamp'> &
  Partial<Pick<EmailEvent, 'recipientEmail' | 'severity' | 'suppress' | 'error'>>;

export class GiftEmailAnalyticsBatchProcessor implements BatchEventProcessor {
  private readonly deps: {
    giftDeliveryService: Pick<GiftDeliveryService, 'recordOutcome' | 'getRecipientEmailForMessage'>;
    emailSuppressionList: Pick<
      typeof EmailSuppressionList,
      'handleBounce' | 'handleComplaint' | 'removeComplaint'
    >;
    requireProviderCleanup?: boolean;
  };

  constructor(deps: GiftEmailAnalyticsBatchProcessor['deps']) {
    this.deps = deps;
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

      // Gifts have no marketing subscription scope and disable open tracking.
      // Leave any provider unsubscribe in place; do not change newsletter consent.
      if (event.type === 'opened' || event.type === 'unsubscribed') {
        result.merge(new EventProcessingResult({ ignored: 1 }));
        continue;
      }
      if (
        event.type === 'complained' ||
        (event.type === 'failed' && event.severity === 'permanent' && event.suppress)
      ) {
        const recipientEmail = await this.deps.giftDeliveryService.getRecipientEmailForMessage(
          event.providerId,
        );
        if (
          !recipientEmail ||
          recipientEmail.toLowerCase() !== event.recipientEmail?.toLowerCase()
        ) {
          result.merge(new EventProcessingResult({ unprocessable: 1 }));
          continue;
        }
        const suppressionEvent = {
          email: recipientEmail,
          timestamp: event.timestamp,
          suppress: event.suppress ?? false,
        };
        if (event.type === 'complained') {
          await this.deps.emailSuppressionList.handleComplaint(suppressionEvent);
          await this.deps.emailSuppressionList.removeComplaint(recipientEmail, {
            requireSuccess: this.deps.requireProviderCleanup ?? true,
          });
          result.merge(new EventProcessingResult({ complained: 1 }));
          continue;
        }
        // Stale delivery outcomes must still complete their safety writes on replay.
        await this.deps.emailSuppressionList.handleBounce(suppressionEvent);
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

      const recordResult = await this.deps.giftDeliveryService.recordOutcome({
        providerMessageId: event.providerId,
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
