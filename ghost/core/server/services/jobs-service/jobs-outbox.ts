import type { Knex } from 'knex';
import { z } from 'zod';
import type { DispatchEnvelope } from '@tryghost/adapter-base-jobs';
import { DbDate } from '#kernel/database/columns';
import { DbJson } from '#kernel/database/columns';

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

export interface ReleaseOutcome {
  released: ReleasedRow[];
  dropped: ReleasedRow[];
}

export type ProcessOutcome =
  | { status: 'idle' }
  | { status: 'delivered'; id: string; type: string; createdAt: Date }
  | { status: 'failed'; id: string; error: unknown };

// The row as the claim query returns it, validated before anything trusts it.
const ClaimedRow = z.object({ id: z.string(), envelope: z.string(), created_at: DbDate });

const SubmittedRow = z.object({ id: z.string(), envelope: z.string() });

// The job type of a submitted row, or null when its envelope cannot be read.
function typeOf(stored: string): string | null {
  const result = z.safeDecode(OutboxEnvelope, stored);
  return result.success ? result.data.payload.job.type : null;
}

// A row whose type cannot be read is released, so the relay's retry path
// deals with it once it is claimed.
function partitionByReplay(
  rows: ReleasedRow[],
  replays: (type: string) => boolean,
): ReleaseOutcome {
  const outcome: ReleaseOutcome = { released: [], dropped: [] };
  for (const row of rows) {
    (row.type === null || replays(row.type) ? outcome.released : outcome.dropped).push(row);
  }
  return outcome;
}

// MySQL rounds a fractional DATETIME, which can round available_at up and leave
// a freshly inserted row, or one due for a retry, briefly ineligible.
function floorToSecond(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000);
}

export class JobsOutbox {
  readonly #knex: Knex;
  readonly #keepUntilSettled: boolean;

  constructor({ knex, keepUntilSettled }: { knex: Knex; keepUntilSettled: boolean }) {
    this.#knex = knex;
    this.#keepUntilSettled = keepUntilSettled;
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
          .update({ available_at: floorToSecond(new Date(Date.now() + retryDelayMs)) });
        return { status: 'failed', id, error };
      }

      // If the process dies before this commits, the claim rolls back and the
      // row is handed over again, so the job can run twice either way.
      const handedOff = trx(TABLE).where('id', id);
      // A kept row stays, marked submitted, until its job settles. submitted_at
      // is a lease on the database clock, so containers on different servers
      // agree on when it has gone stale.
      await (this.#keepUntilSettled
        ? handedOff.update({ submitted_at: trx.raw('UTC_TIMESTAMP()') })
        : handedOff.delete());
      return { status: 'delivered', id, type, createdAt };
    });
  }

  async remove(id: string): Promise<void> {
    await this.#knex(TABLE).where('id', id).delete();
  }

  // Keeps the rows of jobs a live process still holds from going stale
  async renew(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.#knex(TABLE)
      .whereIn('id', ids)
      .whereNotNull('submitted_at')
      .update({ submitted_at: this.#knex.raw('UTC_TIMESTAMP()') });
  }

  // Hands over again rows no process has renewed within staleAfterMs. A job
  // type that is not replayed may not be safe to run again from the start, so
  // its rows are deleted rather than handed over again. Only some of those
  // types recover the work another way.
  async releaseSubmitted({
    replays,
    staleAfterMs,
  }: {
    replays: (type: string) => boolean;
    staleAfterMs: number;
  }): Promise<ReleaseOutcome> {
    // Every statement re-checks staleness, so a renewal that lands between
    // the read and the write keeps its row.
    const stale = () =>
      this.#knex(TABLE)
        .whereNotNull('submitted_at')
        .whereRaw('submitted_at < UTC_TIMESTAMP() - INTERVAL ? MICROSECOND', [staleAfterMs * 1000]);
    const rows = z.array(SubmittedRow).parse(await stale().select('id', 'envelope'));
    const outcome = partitionByReplay(
      rows.map(({ id, envelope }) => ({ id, type: typeOf(envelope) })),
      replays,
    );
    const ids = (list: ReleasedRow[]) => list.map(({ id }) => id);
    if (outcome.released.length > 0) {
      await stale().whereIn('id', ids(outcome.released)).update({ submitted_at: null });
    }
    if (outcome.dropped.length > 0) {
      await stale().whereIn('id', ids(outcome.dropped)).delete();
    }
    return outcome;
  }
}
