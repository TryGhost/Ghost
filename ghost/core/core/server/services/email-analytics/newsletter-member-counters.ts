import type { Knex } from 'knex';
import { IncorrectUsageError } from '@tryghost/errors';
import DatabaseInfo from '@tryghost/database-info';
import ObjectID from 'bson-objectid';
import { z } from 'zod';
import { DbCount } from '../../lib/db-types/count';
import { deriveOpenRate } from './lib/open-rate';

export type MemberSweepPage = { afterId?: string; throughId?: string; limit?: number };
export type MemberSweepResult = { afterId: string | undefined; processed: number };

type MemberCounts = {
  email_count: number;
  email_tracked_count: number;
  email_opened_count: number;
  email_open_rate: number | null;
};
// Aggregates over email_recipients; COUNT/SUM arrive as strings from MySQL.
const DerivedRow = z.object({
  member_id: z.string(),
  email_count: DbCount,
  email_tracked_count: DbCount,
  email_opened_count: DbCount,
});
const MAX_SWEEP_PAGE_SIZE = 5000;
const UPDATE_CHUNK_SIZE = 1000;
const SWEEP_JOB_NAME = 'email-analytics-member-reconciliation';
const checkpointSchema = z.object({
  version: z.literal(1),
  afterId: z
    .string()
    .regex(/^[a-f0-9]{24}$/)
    .nullable(),
  throughId: z
    .string()
    .regex(/^[a-f0-9]{24}$/)
    .nullable(),
  processed: z.number().int().nonnegative(),
  complete: z.boolean(),
});
export type MemberSweepCheckpoint = z.infer<typeof checkpointSchema>;

/** Shared derived truth for initialization, repair and rollback re-baselining. */
export class NewsletterMemberCounters {
  readonly #knex: Knex;

  constructor(knex: Knex) {
    this.#knex = knex;
  }

  /** Apply only explicitly enrolled, frozen batches, atomically with their marker. */
  async applyPreparedBatch(batchId: string): Promise<boolean> {
    const owner = await this.#knex('email_batches').where('id', batchId).first('email_id');
    if (!owner) {
      throw this.#preparationError(batchId, 'Batch does not exist');
    }
    return this.#knex.transaction(async (trx) => {
      // Match ingestion's email-before-recipient-before-member lock order. All
      // reads before the member locks are locking reads, never an old snapshot.
      const email = await trx('emails').where('id', owner.email_id).forUpdate().first();
      const batch = await trx('email_batches').where('id', batchId).forUpdate().first();
      if (!batch || batch.email_id !== owner.email_id) {
        throw this.#preparationError(batchId, 'Batch ownership changed');
      }
      if (!batch.member_counters_enabled || batch.member_counters_applied_at !== null) {
        return false;
      }
      if (!email || email.preflight_email_count === null || email.prepared_at === null) {
        throw this.#preparationError(batchId, 'Member counters require frozen preparation');
      }
      if (batch.status !== 'pending') {
        throw this.#preparationError(batchId, 'Unapplied member counters must precede submission');
      }
      const recipients: {
        email_id: string;
        member_id: string;
        opened_at: Date | null;
        delivered_at: Date | null;
        failed_at: Date | null;
      }[] = await trx('email_recipients')
        .where('batch_id', batchId)
        .select('email_id', 'member_id', 'opened_at', 'delivered_at', 'failed_at')
        .limit(MAX_SWEEP_PAGE_SIZE + 1)
        .forShare();
      if (recipients.length > MAX_SWEEP_PAGE_SIZE) {
        throw this.#preparationError(
          batchId,
          `Member counters support at most ${MAX_SWEEP_PAGE_SIZE} recipients per batch; lower bulkEmail.batchSize`,
        );
      }
      if (
        recipients.length !== batch.recipient_count ||
        recipients.some((row) => row.email_id !== email.id)
      ) {
        throw this.#preparationError(
          batchId,
          'Prepared recipient membership does not match the batch',
        );
      }
      if (
        recipients.some(
          (row) => row.opened_at !== null || row.delivered_at !== null || row.failed_at !== null,
        )
      ) {
        throw this.#preparationError(
          batchId,
          'Recipient events preceded member counter application',
        );
      }
      const deltas = new Map<string, number>();
      for (const row of recipients) {
        deltas.set(row.member_id, (deltas.get(row.member_id) ?? 0) + 1);
      }
      const members: ({ id: string } & Omit<MemberCounts, 'email_tracked_count'> & {
          email_tracked_count: number | null;
        })[] = await this.#members(trx)
        .whereIn('id', [...deltas.keys()])
        .select('id', 'email_count', 'email_tracked_count', 'email_opened_count', 'email_open_rate')
        .orderBy('id')
        .forUpdate();
      const uninitialized = members
        .filter((row) => row.email_tracked_count === null)
        .map((row) => row.id);
      const baseline =
        uninitialized.length > 0
          ? await this.#derive(trx, uninitialized)
          : new Map<string, MemberCounts>();
      const totals = new Map<string, MemberCounts>();
      for (const member of members) {
        const current =
          member.email_tracked_count === null
            ? (baseline.get(member.id) ?? {
                email_count: 0,
                email_tracked_count: 0,
                email_opened_count: 0,
                email_open_rate: null,
              })
            : member;
        const delta = deltas.get(member.id)!;
        const tracked = Number(current.email_tracked_count) + (email.track_opens ? delta : 0);
        const opened = Number(current.email_opened_count);
        totals.set(member.id, {
          email_count: Number(current.email_count) + delta,
          email_tracked_count: tracked,
          email_opened_count: opened,
          email_open_rate: deriveOpenRate(opened, tracked),
        });
      }
      if (members.length > 0) {
        await this.#setCounts(
          trx,
          members.map((row) => row.id),
          totals,
        );
      }
      await trx('email_batches')
        .where('id', batchId)
        .update({ member_counters_applied_at: trx.fn.now() });
      return true;
    }, this.#transactionConfig());
  }

  #preparationError(batchId: string, message: string) {
    return this.#nonRetryable(message, `Email batch ${batchId}`);
  }

  /** A deterministic failure: callers with retry budgets must not spend them on it. */
  #nonRetryable(message: string, context: string) {
    return Object.assign(new IncorrectUsageError({ message, context }), { retryable: false });
  }

  /**
   * Resume the persisted sweep. `restart` abandons whatever checkpoint exists,
   * complete or not, and begins a fresh sweep over the current member range.
   */
  async runSweepPage({
    limit = MAX_SWEEP_PAGE_SIZE,
    restart = false,
  }: {
    limit?: number;
    restart?: boolean;
  } = {}): Promise<MemberSweepCheckpoint> {
    this.#validateLimit(limit);
    // Outside the page transaction: this range lookup must not establish its
    // recipient snapshot before the member locks. New members are initialized
    // by preparation; a later full sweep will also visit them.
    const upper = await this.#knex('members').max('id as id').first();
    const throughId: string | null = upper?.id ?? null;
    const initial: MemberSweepCheckpoint = {
      version: 1,
      afterId: null,
      throughId,
      processed: 0,
      complete: throughId === null,
    };
    await this.#knex('jobs')
      .insert({
        id: ObjectID().toHexString(),
        name: SWEEP_JOB_NAME,
        created_at: new Date(),
        started_at: new Date(),
        status: initial.complete ? 'finished' : 'started',
        finished_at: initial.complete ? new Date() : null,
        metadata: JSON.stringify(initial),
      })
      .onConflict('name')
      .ignore();
    return this.#knex.transaction(async (trx) => {
      const job = await trx('jobs').where('name', SWEEP_JOB_NAME).forUpdate().first();
      if (!job) {
        throw this.#nonRetryable(
          'Member counter sweep checkpoint disappeared while starting a page',
          `Jobs row ${SWEEP_JOB_NAME}`,
        );
      }
      const state = restart ? initial : this.#parseCheckpoint(job.metadata);
      if (state.complete && !restart) {
        return state;
      }
      const starting = restart;
      if (state.throughId !== null) {
        const page = await this.#sweepPage(trx, {
          afterId: state.afterId ?? undefined,
          throughId: state.throughId,
          limit,
        });
        state.afterId = page.afterId ?? null;
        state.processed += page.processed;
        state.complete = page.processed === 0 || state.afterId === state.throughId;
      }
      await trx('jobs')
        .where('id', job.id)
        .update({
          metadata: JSON.stringify(state),
          updated_at: new Date(),
          status: state.complete ? 'finished' : 'started',
          finished_at: state.complete ? new Date() : null,
          ...(starting ? { started_at: new Date() } : {}),
        });
      return state;
    }, this.#transactionConfig());
  }

  #parseCheckpoint(metadata: unknown): MemberSweepCheckpoint {
    let parsed: unknown;
    try {
      parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    } catch {
      parsed = undefined;
    }
    const checkpoint = checkpointSchema.safeParse(parsed);
    if (!checkpoint.success) {
      // Another writer, a restored database or a newer checkpoint format owns
      // this row. Never overwrite it silently; an operator can pass restart.
      throw this.#nonRetryable(
        'Member counter sweep checkpoint is missing or unreadable; rerun with restart to begin a new sweep',
        `Jobs row ${SWEEP_JOB_NAME}`,
      );
    }
    return checkpoint.data;
  }

  /**
   * The caller persists afterId only after this promise succeeds. Repeating a
   * committed page is safe, including after a lost COMMIT acknowledgement.
   * A page returning zero members ends the sweep; throughId can freeze its range.
   */
  async sweepPage({
    afterId,
    throughId,
    limit = MAX_SWEEP_PAGE_SIZE,
  }: MemberSweepPage = {}): Promise<MemberSweepResult> {
    this.#validateLimit(limit);
    return this.#knex.transaction(
      (trx) => this.#sweepPage(trx, { afterId, throughId, limit }),
      this.#transactionConfig(),
    );
  }

  #validateLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SWEEP_PAGE_SIZE) {
      throw new IncorrectUsageError({
        message: `Member sweep limit must be an integer between 1 and ${MAX_SWEEP_PAGE_SIZE}`,
      });
    }
  }

  #transactionConfig(): Knex.TransactionConfig | undefined {
    return DatabaseInfo.isMySQL(this.#knex) ? { isolationLevel: 'repeatable read' } : undefined;
  }

  async #sweepPage(
    trx: Knex.Transaction,
    { afterId, throughId, limit }: MemberSweepPage & { limit: number },
  ): Promise<MemberSweepResult> {
    // Lock before the first consistent read. Event and preparation increments
    // must take the same member locks before changing recipient-derived totals.
    // An IN-list's input order alone would not establish InnoDB lock order.
    const members = this.#members(trx).select('id').orderBy('id').limit(limit).forUpdate();
    if (afterId !== undefined) {
      members.where('id', '>', afterId);
    }
    if (throughId !== undefined) {
      members.where('id', '<=', throughId);
    }
    const rows: { id: string }[] = await members;
    if (rows.length === 0) {
      return { afterId, processed: 0 };
    }
    const memberIds = rows.map((row) => row.id);
    await this.#setCounts(trx, memberIds, await this.#derive(trx, memberIds));
    return { afterId: memberIds.at(-1), processed: rows.length };
  }

  #members(trx: Knex.Transaction) {
    const query = trx('members');
    if (DatabaseInfo.isMySQL(trx)) {
      query.from(trx.raw('?? FORCE INDEX (PRIMARY)', ['members']));
    }
    return query;
  }

  async #derive(trx: Knex.Transaction, memberIds: string[]): Promise<Map<string, MemberCounts>> {
    // Express the small metadata sets as subqueries evaluated inside the same
    // transaction snapshot as the recipient facts. Inlining them as bound ID
    // lists would grow each statement with the site's history; joining every
    // historical recipient to its email would be far more expensive.
    const untrackedEmails = trx('emails').select('id').where('track_opens', false);
    const discardableEmails = trx('emails')
      .select('id')
      .whereNull('prepared_at')
      .where((builder) =>
        builder
          .whereNotNull('preflight_email_count')
          .orWhereNotExists(
            trx('email_batches')
              .select('id')
              .whereRaw('?? = ??', ['email_batches.email_id', 'emails.id'])
              .whereNot('status', 'pending'),
          ),
      );
    // Legacy preparation with only pending batches is also rebuilt on resume.
    // Preserve the entire legacy set once any batch has started submission.
    const ambiguous = await trx('email_batches')
      .whereIn('email_id', discardableEmails.clone())
      .where((builder) =>
        builder.whereNot('status', 'pending').orWhereNotNull('member_counters_applied_at'),
      )
      .first('email_id');
    if (ambiguous) {
      // Rollback to older send code can submit without saving prepared_at.
      // Those recipients cannot be discarded or silently removed from truth.
      throw this.#nonRetryable(
        'Cannot reconcile member counters for batches submitted or applied without frozen preparation.',
        `Email ${ambiguous.email_id} requires preparation reconciliation.`,
      );
    }
    const pendingBatches = trx('email_batches')
      .select('id')
      .where('member_counters_enabled', true)
      .whereNull('member_counters_applied_at');
    const rows = await trx('email_recipients')
      .select(
        'member_id',
        trx.raw('COUNT(*) AS email_count'),
        trx.raw('SUM(CASE WHEN email_id IN (?) THEN 0 ELSE 1 END) AS email_tracked_count', [
          untrackedEmails,
        ]),
        trx.raw('SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) AS email_opened_count'),
      )
      .whereIn('member_id', memberIds)
      .whereNotIn('email_id', discardableEmails)
      .whereNotIn('batch_id', pendingBatches)
      .groupBy('member_id');
    const counts = new Map<string, MemberCounts>();
    for (const raw of rows) {
      const row = DerivedRow.parse(raw);
      counts.set(row.member_id, {
        email_count: row.email_count,
        email_tracked_count: row.email_tracked_count,
        email_opened_count: row.email_opened_count,
        email_open_rate: deriveOpenRate(row.email_opened_count, row.email_tracked_count),
      });
    }
    return counts;
  }

  async #setCounts(
    trx: Knex.Transaction,
    memberIds: string[],
    counts: Map<string, MemberCounts>,
  ): Promise<void> {
    const columns = [
      'email_count',
      'email_tracked_count',
      'email_opened_count',
      'email_open_rate',
    ] as const;
    // Bound the statement size: a full page carries four CASE ladders.
    for (let start = 0; start < memberIds.length; start += UPDATE_CHUNK_SIZE) {
      const chunk = memberIds.slice(start, start + UPDATE_CHUNK_SIZE);
      const updates: Record<string, Knex.Raw> = {};
      for (const column of columns) {
        const bindings: (string | number | null)[] = [];
        const cases = chunk.map((memberId) => {
          bindings.push(
            memberId,
            counts.get(memberId)?.[column] ?? (column === 'email_open_rate' ? null : 0),
          );
          return 'WHEN ? THEN ?';
        });
        updates[column] = trx.raw(`CASE id ${cases.join(' ')} END`, bindings);
      }
      await trx('members').whereIn('id', chunk).update(updates);
    }
  }
}
