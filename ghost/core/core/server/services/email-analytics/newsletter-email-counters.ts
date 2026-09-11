import type { Knex } from 'knex';
import { IncorrectUsageError } from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { PrometheusClient } from '@tryghost/prometheus-metrics';
import { z } from 'zod';
import { DbCount } from '../../lib/db-types/count';
import { transactionWithRetry } from './lib/transaction-with-retry';

const events = ['delivered', 'opened', 'failed'] as const;
type Event = (typeof events)[number];
type Drift = Record<Event, number>;
type Transitions = Record<Event, readonly unknown[]>;
type Phase = 'baseline' | 'comparison' | 'repair';
type ReconciliationSummary = { repaired: number; failed: number };

// Projection of the `emails` counter columns; the Bookshelf model owns the row.
const DbEmailCounters = z.object({
  delivered_count: DbCount,
  opened_count: DbCount,
  failed_count: DbCount,
});
type Counts = z.output<typeof DbEmailCounters>;
const DbCountRow = z.object({ count: DbCount });

const COMPARISONS_METRIC = 'email_analytics_email_counter_comparisons';
const DRIFT_METRIC = 'email_analytics_email_counter_drift';
const BASELINE_METRIC = 'email_analytics_email_counter_baseline_corrections';
const REPAIR_FAILURES_METRIC = 'email_analytics_email_counter_repair_failures';

/** Newsletter-only counter maintenance. Constructed once at analytics boot. */
export class NewsletterEmailCounters {
  readonly mode: 'compare' | 'incremental';
  // Emails whose baseline this process has committed. Grows with the distinct
  // emails touched during the process lifetime; a restart rebaselines.
  #initialized = new Set<string>();
  // Corrections written by a baseline in a transaction that has not yet been
  // acknowledged as committed; reported once the commit is acknowledged.
  #prepared = new Map<string, Drift>();
  // Emails touched since their last successful final repair. Boot-lifetime and
  // shared by every fetch lane, so a failed repair is retried by a later drain.
  #pendingReconciliation = new Set<string>();
  #draining: Promise<ReconciliationSummary> | null = null;
  #knex: Pick<Knex, 'transaction'>;
  #prometheusClient: Pick<PrometheusClient, 'registerCounter' | 'getMetric'> | null;

  constructor({
    knex,
    mode = 'compare',
    prometheusClient = null,
  }: {
    knex: Pick<Knex, 'transaction'>;
    mode?: 'compare' | 'incremental';
    prometheusClient?: Pick<PrometheusClient, 'registerCounter' | 'getMetric'> | null;
  }) {
    this.#knex = knex;
    this.mode = mode;
    this.#prometheusClient = prometheusClient;
    // `phase` separates observe-only comparison from final repair, so a drift
    // alert calibrated during a comparison soak is not fired by corrected drift.
    prometheusClient?.registerCounter({
      name: COMPARISONS_METRIC,
      help: 'Number of newsletter email counter comparisons and repairs',
      labelNames: ['event', 'phase'],
    });
    prometheusClient?.registerCounter({
      name: DRIFT_METRIC,
      help: 'Sum of absolute newsletter email counter differences observed at comparison or repair',
      labelNames: ['event', 'phase'],
    });
    prometheusClient?.registerCounter({
      name: BASELINE_METRIC,
      help: 'Sum of absolute newsletter email counter differences corrected when a baseline was established',
      labelNames: ['event'],
    });
    prometheusClient?.registerCounter({
      name: REPAIR_FAILURES_METRIC,
      help: 'Number of newsletter email counter repairs that failed and were left queued',
      labelNames: [],
    });
  }

  /**
   * Lock the email row and, on the first touch per process, replace its
   * counters with recounted truth. Must precede recipient locks, within a
   * fresh per-email transaction.
   * @returns the locked counters as read, and the truth written over them
   * when a baseline was taken; null when the email row does not exist
   */
  async prepare(
    trx: Knex.Transaction,
    emailId: string,
  ): Promise<{ current: Counts; baseline: Counts | null } | null> {
    const email = await trx('emails')
      .where('id', emailId)
      .forUpdate()
      .first('delivered_count', 'opened_count', 'failed_count');
    if (!email) {
      // No baseline can be taken; forget any correction a rolled-back attempt
      // recorded so committed() cannot mark this ID initialized.
      this.#prepared.delete(emailId);
      return null;
    }
    const current = DbEmailCounters.parse(email);
    if (this.#initialized.has(emailId)) {
      return { current, baseline: null };
    }

    // Existing counters already have a baseline from recomputation. Correct it
    // once per touched email after startup, including opens from missing lanes.
    // The email lock serializes this handoff with other counter writers. The
    // first consistent read happens AFTER that lock, avoiding a stale snapshot.
    const baseline = await this.#recount(trx, emailId);
    await trx('emails').where('id', emailId).update(baseline);
    // Remember what the baseline changed so a wrong counter left by an earlier
    // process is still observable, even though comparisons start from the
    // corrected values. Reported by committed(), so a rolled-back attempt
    // does not count and a retry reports once.
    this.#prepared.set(emailId, this.#diff(current, baseline));
    return { current, baseline };
  }

  async #recount(trx: Knex.Transaction, emailId: string): Promise<Counts> {
    // One covering-index count per outcome, as the legacy recount did. Lane
    // flags must never suppress opened counting in the source of truth.
    const counts = await Promise.all(
      events.map(async (event) => {
        const row = await trx('email_recipients')
          .where('email_id', emailId)
          .whereNotNull(`${event}_at`)
          .count({ count: '*' })
          .first();
        return DbCountRow.parse(row).count;
      }),
    );
    return {
      delivered_count: counts[0],
      opened_count: counts[1],
      failed_count: counts[2],
    };
  }

  async increment(trx: Knex.Transaction, emailId: string, transitions: Transitions): Promise<void> {
    const increments: Record<string, Knex.Raw> = {};
    for (const event of events) {
      if (transitions[event].length) {
        increments[`${event}_count`] = trx.raw('?? + ?', [
          `${event}_count`,
          transitions[event].length,
        ]);
      }
    }
    if (Object.keys(increments).length) {
      await trx('emails').where('id', emailId).update(increments);
    }
  }

  /** Only call after COMMIT is acknowledged; retries may safely rebaseline. */
  committed(emailId: string): void {
    // A missing email row takes no baseline, so it must not be remembered as
    // initialized: a later row with that ID would receive raw increments.
    const correction = this.#prepared.get(emailId);
    if (correction) {
      this.#prepared.delete(emailId);
      this.#initialized.add(emailId);
      this.#report(emailId, correction, 'baseline');
    }
  }

  /** Whether email recounts are deferred to a final repair instead of compared mid-fetch. */
  get incremental(): boolean {
    return this.mode === 'incremental';
  }

  get hasPendingReconciliation(): boolean {
    return this.#pendingReconciliation.size > 0;
  }

  deferReconciliation(emailIds: readonly string[]): void {
    for (const emailId of emailIds) {
      this.#pendingReconciliation.add(emailId);
    }
  }

  /**
   * Repair every queued email. Different fetch processors share this
   * boot-lifetime queue, so drains run one at a time, each over a snapshot.
   * A failed repair is logged and left queued for the next drain rather than
   * failing the fetch: its recipient facts and increments are already
   * committed, and failing here would discard the fetch cursor and the member
   * statistics that follow.
   */
  async reconcilePending(): Promise<ReconciliationSummary> {
    this.#requireIncremental('Newsletter email counter repair');
    const drain = (this.#draining ?? Promise.resolve()).then(
      () => this.#drain(),
      () => this.#drain(),
    );
    this.#draining = drain;
    try {
      return await drain;
    } finally {
      if (this.#draining === drain) {
        this.#draining = null;
      }
    }
  }

  async #drain(): Promise<ReconciliationSummary> {
    const summary: ReconciliationSummary = { repaired: 0, failed: 0 };
    for (const emailId of [...this.#pendingReconciliation]) {
      // Remove before repairing: an event arriving during the repair queues the
      // email again, and that newer work must survive this drain.
      this.#pendingReconciliation.delete(emailId);
      try {
        await this.reconcile(emailId);
        summary.repaired += 1;
      } catch (error) {
        this.#pendingReconciliation.add(emailId);
        summary.failed += 1;
        logging.error(
          `[EmailAnalytics] Newsletter email counter repair failed for ${emailId}; retrying at the next final aggregation`,
          error,
        );
        this.#inc(REPAIR_FAILURES_METRIC, {}, 1);
      }
    }
    return summary;
  }

  async compare(emailId: string): Promise<Drift | null> {
    return this.#observe(emailId, false);
  }

  async reconcile(emailId: string): Promise<Drift | null> {
    this.#requireIncremental(`Newsletter email counter repair for ${emailId}`);
    return this.#observe(emailId, true);
  }

  #requireIncremental(action: string): void {
    if (!this.incremental) {
      // Comparison must never hide a bad counter by repairing it.
      throw new IncorrectUsageError({
        message: `${action} requires the incremental email counter mode`,
      });
    }
  }

  async #observe(emailId: string, repair: boolean): Promise<Drift | null> {
    const drift = await transactionWithRetry(this.#knex, async (trx) => {
      const state = await this.prepare(trx, emailId);
      if (!state) {
        return null;
      }
      // A baseline just replaced the counters with truth; there is nothing
      // left to compare or repair, and recounting again would be wasted.
      if (state.baseline) {
        return { delivered: 0, opened: 0, failed: 0 };
      }
      const truth = await this.#recount(trx, emailId);
      if (repair) {
        // Keep the email lock through repair so a concurrent event increment
        // cannot be overwritten with counts from an earlier snapshot.
        await trx('emails').where('id', emailId).update(truth);
      }
      return this.#diff(state.current, truth);
    });
    this.committed(emailId);
    if (drift) {
      // Comparison stays observe-only. Final reconciliation reports the drift
      // observed before repair so operators can distinguish repair from parity.
      this.#report(emailId, drift, repair ? 'repair' : 'comparison');
    }
    return drift;
  }

  #diff(current: Counts, truth: Counts): Drift {
    return {
      delivered: current.delivered_count - truth.delivered_count,
      opened: current.opened_count - truth.opened_count,
      failed: current.failed_count - truth.failed_count,
    };
  }

  #report(emailId: string, drift: Drift, phase: Phase): void {
    if (events.some((event) => drift[event] !== 0)) {
      logging.warn(
        `[EmailAnalytics] Newsletter email counter drift: ${JSON.stringify({ emailId, drift, phase })}`,
      );
    }
    for (const event of events) {
      if (phase === 'baseline') {
        this.#inc(BASELINE_METRIC, { event }, Math.abs(drift[event]));
      } else {
        this.#inc(COMPARISONS_METRIC, { event, phase }, 1);
        this.#inc(DRIFT_METRIC, { event, phase }, Math.abs(drift[event]));
      }
    }
  }

  #inc(name: string, labels: Record<string, string>, value: number): void {
    try {
      const metric = this.#prometheusClient?.getMetric(name);
      if (metric && 'inc' in metric) {
        metric.inc(labels, value);
      }
    } catch (error) {
      logging.error(`[EmailAnalytics] Error recording ${name}`, error);
    }
  }
}
