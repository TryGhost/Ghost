import type { Knex } from 'knex';
import { IncorrectUsageError } from '@tryghost/errors';
import DatabaseInfo from '@tryghost/database-info';
import ObjectID from 'bson-objectid';
import { z } from 'zod';
import { DbCount } from '../../lib/db-types/count';
import { deriveOpenRate } from './lib/open-rate';
import logging from '@tryghost/logging';
import { incrementCounter, type CounterMetricsClient } from './lib/counter-metrics';

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
type MemberDrift = Partial<
  Record<keyof MemberCounts, { actual: number | null; expected: number | null }>
>;
// Projection of the members counter columns; the Bookshelf model owns the row.
const DbMemberCounters = z.object({
  id: z.string(),
  email_count: DbCount,
  email_tracked_count: DbCount.nullable(),
  email_opened_count: DbCount,
  email_open_rate: DbCount.nullable(),
});
type DbMemberCounters = z.output<typeof DbMemberCounters>;
const MEMBER_COMPARISONS_METRIC = 'email_analytics_member_counter_comparisons';
const MEMBER_DRIFT_METRIC = 'email_analytics_member_counter_drift';
const MEMBER_COUNTER_COLUMNS = [
  'email_count',
  'email_tracked_count',
  'email_opened_count',
  'email_open_rate',
] as const;
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
  readonly #prometheusClient: CounterMetricsClient | null;

  constructor(
    knex: Knex,
    { prometheusClient = null }: { prometheusClient?: CounterMetricsClient | null } = {},
  ) {
    this.#knex = knex;
    this.#prometheusClient = prometheusClient;
    // `phase` matches the email counter metrics, so a later repair phase can
    // be told apart from observe-only comparison without changing the series.
    prometheusClient?.registerCounter({
      name: MEMBER_COMPARISONS_METRIC,
      help: 'Number of initialized newsletter member counter comparisons',
      labelNames: ['statistic', 'phase'],
    });
    prometheusClient?.registerCounter({
      name: MEMBER_DRIFT_METRIC,
      help: 'Sum of absolute member counter differences; null rate mismatches count as one',
      labelNames: ['statistic', 'phase'],
    });
  }

  /** Observe initialized counters against the same opens-inclusive derived truth. */
  async compareMembers(memberIds: string[]): Promise<Map<string, MemberDrift>> {
    const ids = [...new Set(memberIds)];
    if (!ids.length) {
      return new Map();
    }
    this.#validateLimit(ids.length);
    const comparisons = await this.#knex.transaction(async (trx) => {
      const members = await this.#lockMembers(trx, ids, { initializedOnly: true });
      if (!members.length) {
        return new Map<string, MemberDrift>();
      }
      const truth = await this.#derive(
        trx,
        members.map((member) => member.id),
      );
      const result = new Map<string, MemberDrift>();
      for (const member of members) {
        const expected = truth.get(member.id) ?? {
          email_count: 0,
          email_tracked_count: 0,
          email_opened_count: 0,
          email_open_rate: null,
        };
        const differences: MemberDrift = {};
        for (const column of MEMBER_COUNTER_COLUMNS) {
          if (member[column] !== expected[column]) {
            differences[column] = { actual: member[column], expected: expected[column] };
          }
        }
        result.set(member.id, differences);
      }
      return result;
    }, this.#transactionConfig());
    const drift = [...comparisons].filter(([, differences]) => Object.keys(differences).length);
    if (drift.length) {
      logging.warn(
        `[EmailAnalytics] Newsletter member counter drift: ${JSON.stringify(drift.map(([memberId, differences]) => ({ memberId, differences })))}`,
      );
    }
    for (const differences of comparisons.values()) {
      for (const statistic of MEMBER_COUNTER_COLUMNS) {
        const labels = { statistic, phase: 'comparison' };
        incrementCounter(this.#prometheusClient, MEMBER_COMPARISONS_METRIC, labels, 1);
        const difference = differences[statistic];
        if (difference) {
          incrementCounter(
            this.#prometheusClient,
            MEMBER_DRIFT_METRIC,
            labels,
            difference.actual === null || difference.expected === null
              ? 1
              : Math.abs(difference.actual - difference.expected),
          );
        }
      }
    }
    return comparisons;
  }

  /** Lock member counter rows in primary-key order and validate them. */
  async #lockMembers(
    trx: Knex.Transaction,
    memberIds: string[],
    { initializedOnly = false } = {},
  ): Promise<DbMemberCounters[]> {
    const query = this.#members(trx)
      .whereIn('id', memberIds)
      .select('id', 'email_count', 'email_tracked_count', 'email_opened_count', 'email_open_rate')
      .orderBy('id')
      .forUpdate();
    if (initializedOnly) {
      query.whereNotNull('email_tracked_count');
    }
    const rows: unknown[] = await query;
    return rows.map((row) => DbMemberCounters.parse(row));
  }

  /** Lock before either baseline reads history, and before recipient writes. */
  async prepareEventMembers(
    trx: Knex.Transaction,
    emailId: string,
    recipients: { member_id: string; batch_id: string }[],
  ): Promise<Map<string, MemberCounts>> {
    if (!recipients.length) {
      return new Map();
    }
    // These locking reads must also precede the first baseline snapshot. The
    // email lock already serializes preparation and events for this email.
    const email = await trx('emails').where('id', emailId).forShare().first();
    const batches = await trx('email_batches')
      .whereIn('id', [...new Set(recipients.map((row) => row.batch_id))])
      .orderBy('id')
      .forShare();
    if (
      !email ||
      (email.preflight_email_count !== null && email.prepared_at === null) ||
      batches.some(
        (batch) => batch.member_counters_enabled && batch.member_counters_applied_at === null,
      )
    ) {
      // Only a rollback to older send code, or an abandoned preparation, can
      // produce events before a batch's denominator was applied. Failing here
      // would stall every newsletter's ingestion on one email, so record the
      // recipient facts without member increments and let comparison report
      // the drift and the shared sweep repair it.
      logging.error(
        `[EmailAnalytics] Skipping member counters for email ${emailId}: recipient events arrived before member counter preparation completed`,
      );
      return new Map();
    }
    const memberIds = [...new Set(recipients.map((row) => row.member_id))];
    const members = await this.#lockMembers(trx, memberIds);
    const uninitialized = members
      .filter((row) => row.email_tracked_count === null)
      .map((row) => row.id);
    const baseline = uninitialized.length
      ? await this.#derive(trx, uninitialized)
      : new Map<string, MemberCounts>();
    if (uninitialized.length) {
      await this.#setCounts(trx, uninitialized, baseline);
    }
    return new Map(
      members.map((member) => [
        member.id,
        member.email_tracked_count === null
          ? (baseline.get(member.id) ?? {
              email_count: 0,
              email_tracked_count: 0,
              email_opened_count: 0,
              email_open_rate: null,
            })
          : { ...member, email_tracked_count: member.email_tracked_count },
      ]),
    );
  }

  /** Apply exact recipient transitions; multiple recipients may share a member. */
  async incrementOpened(
    trx: Knex.Transaction,
    transitions: { memberId: string }[],
    baseline: Map<string, MemberCounts>,
  ): Promise<void> {
    const totals = new Map<string, MemberCounts>();
    for (const { memberId } of transitions) {
      const current = totals.get(memberId) ?? baseline.get(memberId);
      if (!current) {
        continue;
      }
      const opened = Number(current.email_opened_count) + 1;
      const tracked = Number(current.email_tracked_count);
      totals.set(memberId, {
        ...current,
        email_opened_count: opened,
        email_open_rate: deriveOpenRate(opened, tracked),
      });
    }
    if (totals.size) {
      await this.#setCounts(trx, [...totals.keys()], totals);
    }
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
      const members = await this.#lockMembers(trx, [...deltas.keys()]);
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
        'Member counter sweep checkpoint is missing or unreadable; rerun with --restart to begin a new sweep',
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
    // Legacy preparation with only pending batches is also rebuilt on resume.
    // Preserve the entire recipient set once any batch has started submission
    // or been applied, including an accounted email whose prepared_at was never
    // saved (a rollback to older send code can submit that way): the send path
    // refuses to discard such a set, so its recipients are frozen facts.
    // Treating them as truth keeps live ingestion and comparison running rather
    // than stopping every newsletter's counters on one anomalous email.
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
      )
      .whereNotExists(
        trx('email_batches')
          .select('id')
          .whereRaw('?? = ??', ['email_batches.email_id', 'emails.id'])
          .where((builder) =>
            builder.whereNot('status', 'pending').orWhereNotNull('member_counters_applied_at'),
          ),
      );
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
    // Bound the statement size: a full page carries four CASE ladders.
    for (let start = 0; start < memberIds.length; start += UPDATE_CHUNK_SIZE) {
      const chunk = memberIds.slice(start, start + UPDATE_CHUNK_SIZE);
      const updates: Record<string, Knex.Raw> = {};
      for (const column of MEMBER_COUNTER_COLUMNS) {
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
