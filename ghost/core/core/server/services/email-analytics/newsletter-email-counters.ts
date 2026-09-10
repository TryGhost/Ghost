import type { Knex } from 'knex';
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

/** Newsletter-only counter maintenance. Constructed once at analytics boot. */
export class NewsletterEmailCounters {
  readonly mode: 'compare' | 'incremental';
  // Emails whose baseline this process has committed. Grows with the distinct
  // emails touched during the process lifetime; a restart rebaselines.
  #initialized = new Set<string>();
  // Corrections written by a baseline in a transaction that has not yet been
  // acknowledged as committed; reported once the commit is acknowledged.
  #prepared = new Map<string, Drift>();
  #pendingReconciliation = new Map<string, symbol>();
  #draining: Promise<void> | null = null;
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
    prometheusClient?.registerCounter({
      name: COMPARISONS_METRIC,
      help: 'Number of newsletter email counter comparisons',
      labelNames: ['event'],
    });
    prometheusClient?.registerCounter({
      name: DRIFT_METRIC,
      help: 'Sum of absolute newsletter email counter differences observed at comparison',
      labelNames: ['event'],
    });
    prometheusClient?.registerCounter({
      name: BASELINE_METRIC,
      help: 'Sum of absolute newsletter email counter differences corrected when a baseline was established',
      labelNames: ['event'],
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

  get hasPendingReconciliation(): boolean {
    return this.#pendingReconciliation.size > 0;
  }

  deferReconciliation(emailIds: readonly string[]): void {
    for (const emailId of emailIds) {
      this.#pendingReconciliation.set(emailId, Symbol());
    }
  }

  async reconcilePending(): Promise<void> {
    // Different fetch processors share this boot-lifetime queue. Serialize
    // drains, but let each drain finish a bounded snapshot of pending work.
    while (this.#draining) {
      // A failed drain is reported to its own caller; waiters only need it over.
      await this.#draining.catch(() => {});
    }
    this.#draining = this.#drain();
    try {
      await this.#draining;
    } finally {
      this.#draining = null;
    }
  }

  async #drain(): Promise<void> {
    for (const [emailId, generation] of [...this.#pendingReconciliation]) {
      await this.reconcile(emailId);
      // An event arriving during repair must retain its newly queued work.
      if (this.#pendingReconciliation.get(emailId) === generation) {
        this.#pendingReconciliation.delete(emailId);
      }
    }
  }

  async compare(emailId: string): Promise<Drift | null> {
    return this.#observe(emailId, false);
  }

  async reconcile(emailId: string): Promise<Drift | null> {
    return this.#observe(emailId, true);
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
    try {
      for (const event of events) {
        if (phase === 'baseline') {
          this.#inc(BASELINE_METRIC, event, Math.abs(drift[event]));
        } else {
          this.#inc(COMPARISONS_METRIC, event, 1);
          this.#inc(DRIFT_METRIC, event, Math.abs(drift[event]));
        }
      }
    } catch (error) {
      logging.error('[EmailAnalytics] Error recording newsletter email counter drift', error);
    }
  }

  #inc(name: string, event: Event, value: number): void {
    const metric = this.#prometheusClient?.getMetric(name);
    if (metric && 'inc' in metric) {
      metric.inc({ event }, value);
    }
  }
}
