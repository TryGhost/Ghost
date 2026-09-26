import { createHash } from 'node:crypto';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { emailEventSchema, type EmailEvent } from '@tryghost/adapter-base-email';
import { toDatabaseDate } from '../../lib/db-types/date';
import { z } from 'zod';

export const processingResultSchema = z.object({
  emailId: z.string().optional(),
  memberId: z.string().optional(),
  cleanup: z.enum(['complaint', 'unsubscribe']).optional(),
});
export type ProcessingResult = z.infer<typeof processingResultSchema>;
export interface EventLease {
  id: string;
  token: string;
  source: string;
  event: EmailEvent;
  attempts: number;
}
const TABLE = 'email_provider_events';
const LEASE_MS = 5 * 60 * 1000;

/** The database is the queue; jobs are only wake-up signals. */
export class EmailInboxRepository {
  private readonly knex: Knex;
  constructor(knex: Knex) {
    this.knex = knex;
  }

  async enqueue(source: string, inputs: unknown[], now = new Date()): Promise<void> {
    // Validate the entire notification before committing any of it.
    const events = inputs.map((input) => emailEventSchema.parse(input));
    await this.knex.transaction(async (trx) => {
      for (const event of events) {
        const key = createHash('sha256')
          .update(
            JSON.stringify([source, event.id, event.family, event.recipientEmail.toLowerCase()]),
          )
          .digest('hex');
        await trx(TABLE)
          .insert({
            id: ObjectId().toHexString(),
            event_key: key,
            source,
            payload: JSON.stringify(event),
            status: 'pending',
            attempts: 0,
            next_attempt_at: toDatabaseDate(now),
            created_at: toDatabaseDate(now),
          })
          .onConflict('event_key')
          .ignore();
      }
    });
  }

  async claim(now = new Date()): Promise<EventLease | null> {
    const due = (query: Knex.QueryBuilder) =>
      query
        .where((builder) => {
          builder.where({ status: 'pending' }).where('next_attempt_at', '<=', toDatabaseDate(now));
        })
        .orWhere((builder) => {
          builder
            .where({ status: 'processing' })
            .where('lease_expires_at', '<=', toDatabaseDate(now));
        });
    const candidates = await this.knex(TABLE).where(due).orderBy('created_at').limit(20);
    for (const row of candidates) {
      const token = ObjectId().toHexString();
      const count = await this.knex(TABLE)
        .where({ id: row.id })
        .andWhere(due)
        .update({
          status: 'processing',
          lease_token: token,
          lease_expires_at: toDatabaseDate(new Date(now.getTime() + LEASE_MS)),
          attempts: this.knex.raw('attempts + 1'),
        });
      if (count) {
        return {
          id: row.id,
          token,
          source: row.source,
          event: emailEventSchema.parse(JSON.parse(row.payload)),
          attempts: row.attempts + 1,
        };
      }
    }
    return null;
  }

  async apply(
    lease: EventLease,
    apply: (trx: Knex.Transaction) => Promise<ProcessingResult>,
  ): Promise<ProcessingResult | null> {
    return this.knex.transaction(async (trx) => {
      const row = await trx(TABLE)
        .where({ id: lease.id, lease_token: lease.token, status: 'processing' })
        .forUpdate()
        .first();
      if (!row) {
        return null;
      }
      if (row.applied_at) {
        return processingResultSchema.parse(JSON.parse(row.result));
      }
      const result = await apply(trx);
      await trx(TABLE)
        .where({ id: lease.id })
        .update({ applied_at: toDatabaseDate(new Date()), result: JSON.stringify(result) });
      return result;
    });
  }

  async complete(lease: EventLease): Promise<void> {
    await this.knex(TABLE)
      .where({ id: lease.id, lease_token: lease.token })
      .update({
        status: 'completed',
        payload: '{}',
        result: null,
        completed_at: toDatabaseDate(new Date()),
        lease_token: null,
        lease_expires_at: null,
        last_error: null,
      });
  }

  async retry(lease: EventLease, error: unknown, now = new Date()): Promise<void> {
    // Quarantined events remain inspectable and can be explicitly replayed.
    const exhausted = lease.attempts >= 20;
    const delay = Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(lease.attempts, 12));
    await this.knex(TABLE)
      .where({ id: lease.id, lease_token: lease.token })
      .update({
        status: exhausted ? 'failed' : 'pending',
        next_attempt_at: toDatabaseDate(new Date(now.getTime() + delay)),
        lease_token: null,
        lease_expires_at: null,
        last_error: (error instanceof Error
          ? error.message
          : 'Email event processing failed'
        ).slice(0, 2000),
      });
  }
}
