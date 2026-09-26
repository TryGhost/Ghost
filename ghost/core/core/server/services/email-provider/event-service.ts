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
import type { Knex } from 'knex';
import type { Queries } from '../email-analytics/lib/queries';
import type { GiftDeliveryService } from '../gifts/gift-delivery-service';
import {
  EmailEventRepository,
  EmailRecipientNotFoundError,
  type ProcessingResult,
} from './event-repository';

const WEBHOOK_LOOKUP_RETRY_MS = 500;
const eventsSchema = z.array(emailEventSchema).max(1000);

export class EmailEventService {
  private readonly outcomes = new EmailEventRepository();
  private readonly deps: {
    knex: Knex;
    provider: Pick<EmailProviderBase, 'source' | 'getEventSource' | 'removeSuppression'>;
    queries: Pick<Queries, 'aggregateEmailStats' | 'aggregateMemberStatsBatch'>;
    gifts: Pick<GiftDeliveryService, 'recordOutcome'>;
  };

  constructor(deps: EmailEventService['deps']) {
    this.deps = deps;
  }

  async ingest(events: unknown[], family?: EmailFamily): Promise<void> {
    const parsed = eventsSchema.parse(events);
    if (family && parsed.some((event) => event.family !== family)) {
      throw new errors.IncorrectUsageError({
        message: 'Email provider returned events for the wrong family',
      });
    }
    await this.processEvents(parsed);
  }

  async webhook(source: string, request: WebhookRequest): Promise<WebhookResult> {
    const provider = this.deps.provider;
    const events = provider.getEventSource();
    if (source !== provider.source || events.type !== 'webhook') {
      throw new errors.NotFoundError({ message: 'Email webhook source was not found' });
    }
    const verified = await events.verify(request);
    if ('events' in verified) {
      // Validate the entire notification before changing any records.
      await this.processEvents(eventsSchema.parse(verified.events), true);
    } else {
      z.object({
        status: z.union([z.literal(200), z.literal(204)]),
        body: z.string().max(65535).optional(),
        contentType: z.string().max(100).optional(),
      }).parse(verified.response);
    }
    return verified;
  }

  private async processEvents(events: EmailEvent[], retryLookup = false): Promise<void> {
    const provider = this.deps.provider;
    const apply = () =>
      this.deps.knex.transaction(async (trx) => {
        const results: (ProcessingResult | null)[] = [];
        for (const event of events) {
          try {
            results.push(await this.outcomes.apply(trx, event));
          } catch (error) {
            // Polling has always skipped unmatched recipients (including deleted
            // records). One such event must not stall its entire history cursor.
            if (retryLookup || !(error instanceof EmailRecipientNotFoundError)) {
              throw error;
            }
            logging.warn(error);
            results.push(null);
          }
        }
        return results;
      });
    let results;
    try {
      results = await apply();
    } catch (error) {
      if (!retryLookup || !(error instanceof EmailRecipientNotFoundError)) {
        throw error;
      }
      // A provider can notify us before the sending request saves its message ID.
      // Roll back and release the connection before waiting, then use a fresh
      // transaction so the lookup can see the newly committed send. Wait at most
      // once per notification, regardless of how many events it contains.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, WEBHOOK_LOOKUP_RETRY_MS);
      });
      results = await apply();
    }

    for (const [index, event] of events.entries()) {
      const result = results[index];
      if (!result) {
        continue;
      }
      if (event.family === 'gifts' && ['delivered', 'failed'].includes(event.type)) {
        const outcome =
          event.type === 'delivered'
            ? 'delivered'
            : event.severity === 'permanent'
              ? 'permanent_failed'
              : 'temporary_failed';
        const recorded = await this.deps.gifts.recordOutcome({
          providerMessageId: event.providerId,
          outcome,
          timestamp: event.timestamp,
          error: event.error ? JSON.stringify(event.error) : null,
        });
        if (recorded === 'not_found') {
          throw new EmailRecipientNotFoundError();
        }
      }
      const cleanup = result.cleanup;
      if (cleanup) {
        await provider.removeSuppression(event.recipientEmail, cleanup);
      }
    }

    const emailIds = new Set(
      results.flatMap((result) => (result?.emailId ? [result.emailId] : [])),
    );
    const memberIds = [
      ...new Set(
        results.flatMap((result) => (result?.emailId && result.memberId ? [result.memberId] : [])),
      ),
    ];
    for (const emailId of emailIds) {
      await this.deps.queries.aggregateEmailStats(emailId, true);
    }
    if (memberIds.length) {
      await this.deps.queries.aggregateMemberStatsBatch(memberIds);
    }
  }
}
