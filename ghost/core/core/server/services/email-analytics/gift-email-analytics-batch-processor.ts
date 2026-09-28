import type { EmailEvent } from '@tryghost/adapter-base-email';
import logging from '@tryghost/logging';
// @ts-expect-error This module lacks type definitions.
import type EmailSuppressionList from '../email-suppression-list';
import type { GiftDeliveryService } from '../gifts/gift-delivery-service';
import type { BatchEventProcessor } from './batch-event-processor';
import { EventProcessingResult } from './event-processing-result';
import { isSameEmailAddress } from './lib/is-same-email-address';

type EmailAnalyticsEvent = Pick<EmailEvent, 'type' | 'providerId' | 'timestamp'> &
  Partial<Pick<EmailEvent, 'recipientEmail' | 'severity' | 'suppress' | 'error'>>;

export class GiftEmailAnalyticsBatchProcessor implements BatchEventProcessor {
  private readonly deps: {
    giftDeliveryService: Pick<GiftDeliveryService, 'recordOutcome' | 'getRecipientEmailForMessage'>;
    emailSuppressionList: Pick<
      typeof EmailSuppressionList,
      'handleBounce' | 'handleComplaint' | 'removeComplaint'
    >;
    eventSource?: 'poll' | 'webhook';
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

      const eventResult = await this.processEvent(event);
      result.merge(eventResult);
    }
  }

  private async processEvent(event: EmailAnalyticsEvent): Promise<EventProcessingResult> {
    // Gift emails disable open tracking and do not change marketing consent.
    if (event.type === 'opened' || event.type === 'unsubscribed') {
      return new EventProcessingResult(
        this.deps.eventSource === 'webhook' ? { ignored: 1 } : { unhandled: 1 },
      );
    }
    if (
      this.deps.eventSource === 'webhook' &&
      (event.type === 'complained' ||
        (event.type === 'failed' && event.severity === 'permanent' && event.suppress))
    ) {
      const recipientEmail = await this.deps.giftDeliveryService.getRecipientEmailForMessage(
        event.providerId,
      );
      if (!recipientEmail) {
        return new EventProcessingResult({ unprocessable: 1 });
      }
      if (!isSameEmailAddress(recipientEmail, event.recipientEmail)) {
        logging.warn(
          { code: 'EMAIL_RECIPIENT_MISMATCH', family: 'gifts', providerId: event.providerId },
          'Ignored email safety event whose recipient does not match the stored message',
        );
        return new EventProcessingResult({ ignored: 1 });
      }
      const suppressionEvent = {
        email: recipientEmail,
        timestamp: event.timestamp,
        suppress: event.suppress ?? false,
      };
      if (event.type === 'complained') {
        await this.deps.emailSuppressionList.handleComplaint(suppressionEvent);
        await this.deps.emailSuppressionList.removeComplaint(recipientEmail, {
          requireSuccess: true,
        });
        return new EventProcessingResult({ complained: 1 });
      }
      // A stale outcome can still carry a complaint or bounce that needs suppression.
      await this.deps.emailSuppressionList.handleBounce(suppressionEvent);
    }

    let outcome: 'delivered' | 'temporary_failed' | 'permanent_failed' | null = null;
    if (event.type === 'delivered') {
      outcome = 'delivered';
    } else if (event.type === 'failed') {
      outcome = event.severity === 'permanent' ? 'permanent_failed' : 'temporary_failed';
    }

    if (!outcome) {
      return new EventProcessingResult({ unhandled: 1 });
    }

    const recordResult = await this.deps.giftDeliveryService.recordOutcome({
      providerMessageId: event.providerId,
      outcome,
      timestamp: event.timestamp,
      error: outcome !== 'delivered' && event.error ? JSON.stringify(event.error) : null,
    });

    if (recordResult === 'not_found') {
      return new EventProcessingResult({ unprocessable: 1 });
    } else if (outcome === 'delivered') {
      return new EventProcessingResult({ delivered: 1 });
    } else if (outcome === 'temporary_failed') {
      return new EventProcessingResult({ temporaryFailed: 1 });
    } else {
      return new EventProcessingResult({ permanentFailed: 1 });
    }
  }
}
