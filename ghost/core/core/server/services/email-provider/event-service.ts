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
import type { BatchEventProcessor } from '../email-analytics/batch-event-processor';
import { EventProcessingResult } from '../email-analytics/event-processing-result';

const WEBHOOK_LOOKUP_RETRY_MS = 500;
const eventsSchema = z.array(emailEventSchema).max(1000);

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
      // Validate the whole notification before passing any events to services.
      await this.processEvents(parseEmailEvents(verified.events));
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
      // Existing services commit independently. Keep aggregates up to date for
      // completed events even when another event cannot be correlated.
      for (const { processor, result } of processors.values()) {
        await processor.aggregate?.({
          includeOpenedEvents: true,
          processingResult: result,
          isFinal: true,
        });
      }
    }
  }
}
