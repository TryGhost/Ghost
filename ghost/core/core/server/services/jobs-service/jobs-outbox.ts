import type { Knex } from 'knex';
import type { DispatchEnvelope } from '@tryghost/adapter-base-jobs';

const TABLE = 'jobs_outbox';

// Forwards a committed dispatch to the backend. Resolves only on confirmed
// acceptance; a rejection or timeout means the entry must be retried.
export type SubmitFn = (id: string, envelope: DispatchEnvelope) => Promise<void>;

export interface OutboxEntry {
  id: string;
  envelope: DispatchEnvelope;
}

export interface InsertOptions {
  // When given, the row is written in the caller's transaction so the DB
  // change and its pending job commit or roll back together. Without it the
  // insert is its own committed write.
  transacting?: Knex.Transaction;
}

// The outcome of claiming one row: nothing eligible, a confirmed delivery (row
// deleted), or a failed submission (row retained with a bumped available_at).
export type ProcessOutcome =
  | { status: 'idle' }
  | { status: 'delivered'; id: string }
  | { status: 'failed'; id: string; error: unknown };

interface ClaimedRow {
  id: string;
  envelope: string;
}

// All access to the jobs_outbox table. MySQL-only by construction: the relay's
// claim uses FOR UPDATE SKIP LOCKED unconditionally, so multiple containers per
// site can poll the same table safely. Timestamps are JS Date instants; the
// MySQL connection is pinned to UTC (timezone 'Z'), so they round-trip as UTC.
export class JobsOutbox {
  readonly #knex: Knex;

  constructor({ knex }: { knex: Knex }) {
    this.#knex = knex;
  }

  async insert({ id, envelope }: OutboxEntry, { transacting }: InsertOptions = {}): Promise<void> {
    const now = new Date();
    const row = {
      id,
      envelope: JSON.stringify(envelope),
      created_at: now,
      // Eligible immediately; the relay moves this forward only on a failed
      // attempt.
      available_at: now,
    };
    const query = this.#knex(TABLE).insert(row);
    await (transacting ? query.transacting(transacting) : query);
  }

  // Claims and processes a single eligible row inside one transaction, holding
  // the row lock across the submission. On confirmed acceptance the row is
  // deleted; on failure or timeout its available_at is moved forward by
  // retryDelayMs so it is not re-picked this cycle while other rows wait. Either
  // way the transaction commits, releasing the lock. Only confirmed acceptance
  // deletes a row.
  async processNext(
    submit: SubmitFn,
    { retryDelayMs }: { retryDelayMs: number },
  ): Promise<ProcessOutcome> {
    return this.#knex.transaction(async (trx) => {
      const rows = (await trx(TABLE)
        .select('id', 'envelope')
        .where('available_at', '<=', new Date())
        // InnoDB appends the PK to the secondary index on available_at, so this
        // order and LIMIT 1 resolve as "first unlocked index entry", no filesort.
        .orderBy([{ column: 'available_at' }, { column: 'id' }])
        .limit(1)
        .forUpdate()
        .skipLocked()) as ClaimedRow[];

      if (rows.length === 0) {
        return { status: 'idle' };
      }

      const { id } = rows[0]!;
      const envelope = JSON.parse(rows[0]!.envelope) as DispatchEnvelope;

      try {
        await submit(id, envelope);
      } catch (error) {
        await trx(TABLE)
          .where('id', id)
          .update({ available_at: new Date(Date.now() + retryDelayMs) });
        return { status: 'failed', id, error };
      }

      await trx(TABLE).where('id', id).delete();
      return { status: 'delivered', id };
    });
  }
}
