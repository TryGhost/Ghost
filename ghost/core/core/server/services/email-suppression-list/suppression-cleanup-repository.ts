import { createHash } from 'node:crypto';
import type { Knex } from 'knex';

export type SuppressionCleanupRequest = {
  kind: 'complaints' | 'unsubscribes';
  email: string;
  domain: string;
  apiOrigin: string;
  eventId: string;
  eventTimestamp: string;
};

export type SuppressionCleanupClaim = {
  id: string;
  attempt: number;
  payload: string;
};

const EVENT_TYPE = 'email-suppression-cleanup';
const LEASE_MS = 10 * 60 * 1000;

function timestamp(date: Date, roundUp = false): string {
  const seconds = roundUp ? Math.ceil(date.getTime() / 1000) : Math.floor(date.getTime() / 1000);
  return new Date(seconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

export class SuppressionCleanupRepository {
  readonly #knex: Knex;

  constructor(knex: Knex) {
    this.#knex = knex;
  }

  /** The caller commits local safety state and this intent in the same transaction. */
  async enqueue(
    request: SuppressionCleanupRequest,
    trx: Knex.Transaction,
    now = new Date(),
  ): Promise<boolean> {
    const id = createHash('sha256')
      .update(
        JSON.stringify([
          EVENT_TYPE,
          request.apiOrigin,
          request.domain,
          request.kind,
          request.email,
          request.eventId,
          request.eventTimestamp,
        ]),
      )
      .digest('hex')
      .slice(0, 24);
    try {
      await trx('outbox').insert({
        id,
        event_type: EVENT_TYPE,
        payload: JSON.stringify(request),
        status: 'pending',
        created_at: timestamp(now),
        available_at: timestamp(now),
        retry_count: 0,
      });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      const sqliteDuplicate =
        code === 'SQLITE_CONSTRAINT' &&
        error instanceof Error &&
        error.message.endsWith('UNIQUE constraint failed: outbox.id');
      if (code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || sqliteDuplicate) {
        return false;
      }
      throw error;
    }
    return true;
  }

  async claim(now = new Date()): Promise<SuppressionCleanupClaim | null> {
    // Range gap locks under REPEATABLE READ can deadlock concurrent status moves.
    const mysql = this.#knex.client.config.client === 'mysql2';
    return this.#knex.transaction(
      async (trx) => {
        let row: { id: string; payload: string; retry_count: number } | undefined;
        // Recover expired workers first; a steady stream of new work must not starve recovery.
        for (const status of ['processing', 'pending']) {
          const query = trx('outbox')
            .where({ event_type: EVENT_TYPE, status })
            .where((eligible) =>
              eligible.whereNull('available_at').orWhere('available_at', '<=', timestamp(now)),
            )
            .orderBy('available_at')
            .orderBy('id')
            .forUpdate()
            .first();
          // Skip locked index entries, including entries being moved between statuses.
          row = await (mysql ? query.skipLocked() : query);
          if (row) {
            break;
          }
        }
        if (!row) {
          return null;
        }
        const attempt = Number(row.retry_count) + 1;
        await trx('outbox')
          .where('id', row.id)
          .update({
            status: 'processing',
            retry_count: attempt,
            last_retry_at: timestamp(now),
            updated_at: timestamp(now),
            available_at: timestamp(new Date(now.getTime() + LEASE_MS), true),
          });
        return { id: row.id, attempt, payload: row.payload };
      },
      mysql ? { isolationLevel: 'read committed' } : undefined,
    );
  }

  async complete(claim: SuppressionCleanupClaim, now = new Date()): Promise<boolean> {
    const count = await this.#knex('outbox')
      .where({
        id: claim.id,
        event_type: EVENT_TYPE,
        status: 'processing',
        retry_count: claim.attempt,
      })
      .update({
        status: 'completed',
        available_at: null,
        updated_at: timestamp(now),
        message: null,
      });
    return count > 0;
  }

  async retry(
    claim: SuppressionCleanupClaim,
    availableAt: Date,
    code: string,
    now = new Date(),
  ): Promise<boolean> {
    const count = await this.#knex('outbox')
      .where({
        id: claim.id,
        event_type: EVENT_TYPE,
        status: 'processing',
        retry_count: claim.attempt,
      })
      .update({
        status: 'pending',
        available_at: timestamp(availableAt, true),
        updated_at: timestamp(now),
        message: code,
      });
    return count > 0;
  }

  async fail(claim: SuppressionCleanupClaim, code: string, now = new Date()): Promise<boolean> {
    const count = await this.#knex('outbox')
      .where({
        id: claim.id,
        event_type: EVENT_TYPE,
        status: 'processing',
        retry_count: claim.attempt,
      })
      .update({ status: 'failed', available_at: null, updated_at: timestamp(now), message: code });
    return count > 0;
  }
}
