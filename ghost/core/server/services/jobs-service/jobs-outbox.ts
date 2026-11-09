import type { Knex } from 'knex';
import { z } from 'zod';
import type { DispatchEnvelope } from '@tryghost/adapter-base-jobs';
import { DbDate } from '../../lib/db-types/date';
import { DbJson } from '../../lib/db-types/json';

const TABLE = 'jobs_outbox';
// knex's generated name for the schema's ['submitted_at', 'available_at'] index on this table.
const CLAIM_INDEX = 'jobs_outbox_submitted_at_available_at_index';

export const OutboxEnvelope = DbJson(
  z.object({
    version: z.literal(1),
    payload: z.object({
      job: z.object({ type: z.string(), payload: z.string() }),
      routing: z.object({ queue: z.string().optional() }).optional(),
    }),
  }),
  { message: 'The stored jobs outbox envelope is not JSON.' },
);

export type SubmitFn = (id: string, envelope: DispatchEnvelope) => Promise<void>;

export interface OutboxEntry {
  id: string;
  envelope: DispatchEnvelope;
}

export interface InsertOptions {
  transacting?: Knex.Transaction;
}

export interface ReleasedRow {
  id: string;
  type: string | null;
}

export type ProcessOutcome =
  | { status: 'idle' }
  | { status: 'delivered'; id: string; type: string; createdAt: Date }
  | { status: 'failed'; id: string; error: unknown };

// The row as the claim query returns it, validated before anything trusts it.
const ClaimedRow = z.object({ id: z.string(), envelope: z.string(), created_at: DbDate });

const SubmittedRow = z.object({ id: z.string(), envelope: z.string() });

// Only for logging which jobs a boot hands over again; a row whose envelope
// cannot be read takes the relay's retry path once it is claimed.
function typeOf(stored: string): string | null {
  const result = z.safeDecode(OutboxEnvelope, stored);
  return result.success ? result.data.payload.job.type : null;
}

// MySQL rounds a fractional DATETIME on insert, which can round available_at up
// and leave a freshly inserted row briefly ineligible.
function floorToSecond(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000);
}

export class JobsOutbox {
  readonly #knex: Knex;

  constructor({ knex }: { knex: Knex }) {
    this.#knex = knex;
  }

  async insert({ id, envelope }: OutboxEntry, { transacting }: InsertOptions = {}): Promise<void> {
    const now = floorToSecond(new Date());
    const row = {
      id,
      envelope: z.encode(OutboxEnvelope, envelope),
      created_at: now,
      available_at: now,
    };
    const query = this.#knex(TABLE).insert(row);
    await (transacting ? query.transacting(transacting) : query);
  }

  async processNext(
    submit: SubmitFn,
    { retryDelayMs }: { retryDelayMs: number },
  ): Promise<ProcessOutcome> {
    return this.#knex.transaction(async (trx) => {
      // InnoDB locks every row a locking read examines, not just the row it
      // returns. Left to the optimizer, a small table (or stale statistics
      // after a truncate) gets a table scan plus filesort, which reads and
      // locks every eligible row before the LIMIT applies, so one relay
      // holding a row starves the others and blocks inserts. Forcing the
      // claim index makes the scan stop at the first unlocked row, and
      // start past the rows already handed over.
      const raw = await trx
        .select('id', 'envelope', 'created_at')
        .from(trx.raw('?? force index (??)', [TABLE, CLAIM_INDEX]))
        .whereNull('submitted_at')
        .where('available_at', '<=', new Date())
        .orderBy([{ column: 'available_at' }, { column: 'id' }])
        .forUpdate()
        .skipLocked()
        .first();

      if (!raw) {
        return { status: 'idle' };
      }

      // A row that does not match the schema means drift that will hit every
      // row, so it throws out of the claim rather than taking the per-row
      // retry path, which needs a trusted id.
      const { id, envelope: stored, created_at: createdAt } = ClaimedRow.parse(raw);

      // Decoding is inside the try so a row that cannot be read takes the same
      // retry path as a rejected submission, instead of throwing out of the
      // transaction and being re-claimed first on every poll.
      let type: string;
      try {
        const envelope: DispatchEnvelope = z.decode(OutboxEnvelope, stored);
        type = envelope.payload.job.type;
        await submit(id, envelope);
      } catch (error) {
        await trx(TABLE)
          .where('id', id)
          .update({ available_at: new Date(Date.now() + retryDelayMs) });
        return { status: 'failed', id, error };
      }

      // The row stays, marked submitted, until its job settles
      await trx(TABLE).where('id', id).update({ submitted_at: new Date() });
      return { status: 'delivered', id, type, createdAt };
    });
  }

  async remove(id: string): Promise<void> {
    await this.#knex(TABLE).where('id', id).delete();
  }

  async releaseSubmitted(): Promise<ReleasedRow[]> {
    const rows = z
      .array(SubmittedRow)
      .parse(await this.#knex(TABLE).select('id', 'envelope').whereNotNull('submitted_at'));
    if (rows.length === 0) {
      return [];
    }
    await this.#knex(TABLE)
      .whereIn(
        'id',
        rows.map(({ id }) => id),
      )
      .update({ submitted_at: null });
    return rows.map(({ id, envelope }) => ({ id, type: typeOf(envelope) }));
  }
}
