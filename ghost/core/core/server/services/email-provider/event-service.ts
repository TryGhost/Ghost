import type {
  EmailEvent,
  EmailFamily,
  EmailProviderBase,
  WebhookRequest,
  WebhookResult,
} from '@tryghost/adapter-base-email';
import { emailEventSchema } from '@tryghost/adapter-base-email';
import { z } from 'zod';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { BatchEventProcessor } from '../email-analytics/batch-event-processor';
import { EventProcessingResult } from '../email-analytics/event-processing-result';

const WEBHOOK_LOOKUP_RETRY_MS = 500;
const eventsSchema = z.array(emailEventSchema);
const notificationEventsSchema = z.array(z.unknown());

export function parseEmailEvents(events: unknown[], family?: EmailFamily): EmailEvent[] {
  const parsed = eventsSchema.parse(events);
  if (family && parsed.some((event) => event.family !== family)) {
    throw new errors.IncorrectUsageError({
      message: 'Email provider returned events for the wrong family',
    });
  }
  return parsed;
}

/** Authenticates webhooks and delegates outcomes to Ghost's existing processors. */
export class EmailEventService {
  private readonly deps: {
    provider: Pick<EmailProviderBase, 'source' | 'getEventSource'>;
    createEventProcessor: (family: EmailFamily) => BatchEventProcessor;
    queueStats: (result: EventProcessingResult) => Promise<void>;
  };

  constructor(deps: EmailEventService['deps']) {
    this.deps = deps;
  }

  async webhook(source: string, request: WebhookRequest): Promise<WebhookResult> {
    const provider = this.deps.provider;
    const events = provider.getEventSource();
    if (source !== provider.source || events.type !== 'webhook') {
      throw new errors.NotFoundError({ message: 'Email webhook source was not found' });
    }
    const verified = await events.verify(request);
    if ('events' in verified) {
      const notification = notificationEventsSchema.safeParse(verified.events);
      if (!notification.success) {
        throw new errors.BadRequestError({
          message: 'Email provider must return an events array',
          code: 'EMAIL_EVENTS_INVALID',
        });
      }
      const valid: EmailEvent[] = [];
      const invalidIndexes: number[] = [];
      for (const [index, event] of notification.data.entries()) {
        const parsed = emailEventSchema.safeParse(event);
        if (parsed.success) {
          valid.push(parsed.data);
        } else {
          invalidIndexes.push(index);
        }
      }
      const invalidError = invalidIndexes.length
        ? new errors.BadRequestError({
            message: 'Email provider returned invalid events',
            code: 'EMAIL_EVENTS_INVALID',
            context: `Invalid event indexes: ${invalidIndexes.join(', ')}`,
          })
        : null;
      if (invalidError) {
        // Report an adapter contract violation without logging recipient addresses or payloads.
        logging.error(invalidError);
      }
      // Valid siblings still run. A processing failure takes precedence so it can
      // retry; otherwise reject malformed events explicitly rather than acknowledging them.
      await this.processEvents(valid);
      if (invalidError) {
        throw invalidError;
      }
    } else {
      z.object({
        status: z.union([z.literal(200), z.literal(204)]),
        body: z.string().max(65535).optional(),
        contentType: z.string().max(100).optional(),
      }).parse(verified.response);
    }
    return verified;
  }

  private async processEvents(events: EmailEvent[]): Promise<void> {
    const processors = new Map<
      EmailFamily,
      {
        processor: BatchEventProcessor;
        result: EventProcessingResult;
      }
    >();
    const process = async (batch: EmailEvent[]): Promise<EmailEvent[]> => {
      const unmatched: EmailEvent[] = [];
      for (const event of batch) {
        let state = processors.get(event.family);
        if (!state) {
          state = {
            processor: this.deps.createEventProcessor(event.family),
            result: new EventProcessingResult(),
          };
          processors.set(event.family, state);
        }
        const result = new EventProcessingResult();
        await state.processor.processBatch([event], result, {});
        state.result.merge(result);
        if (result.unhandled || result.processingFailures) {
          throw new errors.InternalServerError({
            message: 'Email event could not be handled',
            code: 'EMAIL_EVENT_NOT_HANDLED',
            statusCode: 503,
          });
        }
        if (result.unprocessable) {
          unmatched.push(event);
        }
      }
      return unmatched;
    };

    try {
      let unmatched = await process(events);
      if (unmatched.length) {
        // No transaction is held while waiting for the send to save its ID.
        // Retry only unmatched events, once per notification.
        await new Promise<void>((resolve) => {
          setTimeout(resolve, WEBHOOK_LOOKUP_RETRY_MS);
        });
        unmatched = await process(unmatched);
        if (unmatched.length) {
          throw new errors.InternalServerError({
            message: 'Email recipient is not available yet',
            code: 'EMAIL_RECIPIENT_NOT_FOUND',
            statusCode: 503,
          });
        }
      }
    } finally {
      // Persist pending statistics before acknowledging, including completed
      // events in a partly failed notification. Recalculation happens on schedule.
      for (const { result } of processors.values()) {
        await this.deps.queueStats(result);
      }
    }
  }
}
