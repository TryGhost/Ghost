import type {
  EmailFamily,
  EmailProviderBase,
  WebhookRequest,
  WebhookResult,
} from '@tryghost/adapter-base-email';
import { emailEventSchema } from '@tryghost/adapter-base-email';
import { z } from 'zod';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { Queries } from '../email-analytics/lib/queries';
import type { GiftDeliveryService } from '../gifts/gift-delivery-service';
import { EmailInboxRepository, type EventLease, type ProcessingResult } from './inbox-repository';
import { EmailEventRepository } from './event-repository';

export class EmailEventService {
  private readonly inbox: EmailInboxRepository;
  private readonly outcomes = new EmailEventRepository();
  private readonly deps: {
    knex: Knex;
    getSource: (source: string) => EmailProviderBase | undefined;
    queries: Pick<Queries, 'aggregateEmailStats' | 'aggregateMemberStatsBatch'>;
    gifts: Pick<GiftDeliveryService, 'recordOutcome'>;
    wake: () => Promise<void>;
    logError: (error: unknown) => void;
  };

  constructor(deps: EmailEventService['deps']) {
    this.deps = deps;
    this.inbox = new EmailInboxRepository(deps.knex);
  }

  async ingest(source: string, events: unknown[], family?: EmailFamily): Promise<void> {
    const parsed = z.array(emailEventSchema).max(1000).parse(events);
    if (family && parsed.some((event) => event.family !== family)) {
      throw new errors.IncorrectUsageError({
        message: 'Email provider returned events for the wrong family',
      });
    }
    await this.inbox.enqueue(source, parsed);
    // A failed wake must not turn durable acceptance into a failed webhook.
    // The recurring job and boot recovery will find these rows again.
    try {
      await this.deps.wake();
    } catch (error) {
      this.deps.logError(error);
    }
  }

  async webhook(source: string, request: WebhookRequest): Promise<WebhookResult> {
    const provider = this.deps.getSource(source);
    const events = provider?.getEventSource();
    if (!events || events.type !== 'webhook') {
      throw new errors.NotFoundError({ message: 'Email webhook source was not found' });
    }
    const verified = await events.verify(request);
    if ('events' in verified) {
      await this.ingest(source, verified.events);
    } else {
      z.object({
        status: z.union([z.literal(200), z.literal(204)]),
        body: z.string().max(65535).optional(),
        contentType: z.string().max(100).optional(),
      }).parse(verified.response);
    }
    return verified;
  }

  async process(): Promise<void> {
    const applied: { lease: EventLease; result: ProcessingResult }[] = [];
    for (let i = 0; i < 100; i++) {
      const lease = await this.inbox.claim();
      if (!lease) {
        break;
      }
      try {
        const provider = this.deps.getSource(lease.source);
        if (!provider) {
          throw new errors.NotFoundError({
            message: `Email source ${lease.source} must remain configured until its events drain`,
          });
        }
        const result = await this.inbox.apply(lease, async (trx) => {
          const effect = await this.outcomes.apply(trx, lease.source, lease.event);
          return effect;
        });
        if (!result) {
          continue;
        }
        if (lease.event.family === 'gifts' && ['delivered', 'failed'].includes(lease.event.type)) {
          const outcome =
            lease.event.type === 'delivered'
              ? 'delivered'
              : lease.event.severity === 'permanent'
                ? 'permanent_failed'
                : 'temporary_failed';
          const recorded = await this.deps.gifts.recordOutcome({
            providerMessageId: lease.event.providerId,
            providerSource: lease.source,
            outcome,
            timestamp: lease.event.timestamp,
            error: lease.event.error ? JSON.stringify(lease.event.error) : null,
          });
          if (recorded === 'not_found') {
            throw new errors.NotFoundError({ message: 'Gift delivery is not available yet' });
          }
        }

        if (result.cleanup) {
          await provider.removeSuppression(lease.event.recipientEmail, result.cleanup);
        }
        applied.push({ lease, result });
      } catch (error) {
        await this.inbox.retry(lease, error);
        this.deps.logError(error);
      }
    }
    try {
      const emailIds = new Set(
        applied.flatMap((item) => (item.result.emailId ? [item.result.emailId] : [])),
      );
      const memberIds = [
        ...new Set(
          applied.flatMap((item) =>
            item.result.emailId && item.result.memberId ? [item.result.memberId] : [],
          ),
        ),
      ];
      for (const emailId of emailIds) {
        await this.deps.queries.aggregateEmailStats(emailId, true);
      }
      if (memberIds.length) {
        await this.deps.queries.aggregateMemberStatsBatch(memberIds);
      }
      for (const { lease } of applied) {
        await this.inbox.complete(lease);
      }
    } catch (error) {
      for (const { lease } of applied) {
        await this.inbox.retry(lease, error);
      }
      this.deps.logError(error);
    }
    if (applied.length === 100) {
      await this.deps.wake();
    }
  }
}
