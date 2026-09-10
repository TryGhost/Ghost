import type { Knex } from 'knex';
import logging from '@tryghost/logging';
import type { PrometheusClient } from '@tryghost/prometheus-metrics';

const events = ['delivered', 'opened', 'failed'] as const;
type Transitions = Record<(typeof events)[number], readonly unknown[]>;

/** Newsletter-only counter maintenance. Constructed once at analytics boot. */
export class NewsletterEmailCounters {
  #initialized = new Set<string>();
  #knex: Knex;
  #prometheusClient: Pick<PrometheusClient, 'registerCounter' | 'getMetric'> | null;

  constructor({
    knex,
    prometheusClient = null,
  }: {
    knex: Knex;
    prometheusClient?: Pick<PrometheusClient, 'registerCounter' | 'getMetric'> | null;
  }) {
    this.#knex = knex;
    this.#prometheusClient = prometheusClient;
    prometheusClient?.registerCounter({
      name: 'email_analytics_email_counter_comparisons',
      help: 'Number of newsletter email counter comparisons',
      labelNames: ['event'],
    });
    prometheusClient?.registerCounter({
      name: 'email_analytics_email_counter_drift',
      help: 'Sum of absolute newsletter email counter differences observed at comparison',
      labelNames: ['event'],
    });
  }

  /** Must precede recipient locks, within a fresh per-email transaction. */
  async prepare(trx: Knex.Transaction, emailId: string): Promise<void> {
    const email = await trx('emails').where('id', emailId).forUpdate().first('id');
    if (!email || this.#initialized.has(emailId)) {
      return;
    }

    // Existing counters already have a baseline from recomputation. Correct it
    // once per touched email after startup, including opens from missing lanes.
    // The email lock serializes this handoff with other counter writers. The
    // first consistent read happens AFTER that lock, avoiding a stale snapshot.
    const truth = await this.#recount(trx, emailId);
    await trx('emails').where('id', emailId).update(truth);
  }

  async #recount(trx: Knex.Transaction, emailId: string) {
    // Lane flags must never suppress opened counting in the source of truth.
    const row = await trx('email_recipients')
      .where('email_id', emailId)
      .count({
        delivered_count: 'delivered_at',
        opened_count: 'opened_at',
        failed_count: 'failed_at',
      })
      .first();
    return {
      delivered_count: Number(row?.delivered_count ?? 0),
      opened_count: Number(row?.opened_count ?? 0),
      failed_count: Number(row?.failed_count ?? 0),
    };
  }

  async increment(trx: Knex.Transaction, emailId: string, transitions: Transitions): Promise<void> {
    const increments = Object.fromEntries(
      events
        .filter((event) => transitions[event].length)
        .map((event) => [
          `${event}_count`,
          trx.raw('?? + ?', [`${event}_count`, transitions[event].length]),
        ]),
    );
    if (Object.keys(increments).length) {
      await trx('emails').where('id', emailId).update(increments);
    }
  }

  /** Only call after COMMIT is acknowledged; retries may safely rebaseline. */
  committed(emailId: string): void {
    this.#initialized.add(emailId);
  }

  async compare(emailId: string): Promise<Record<(typeof events)[number], number> | null> {
    const drift = await this.#knex.transaction(async (trx) => {
      await this.prepare(trx, emailId);
      const email = await trx('emails').where('id', emailId).first();
      if (!email) {
        return null;
      }
      const truth = await this.#recount(trx, emailId);
      return {
        delivered: Number(email.delivered_count) - truth.delivered_count,
        opened: Number(email.opened_count) - truth.opened_count,
        failed: Number(email.failed_count) - truth.failed_count,
      };
    });
    this.committed(emailId);
    if (drift) {
      // Comparison observes drift; it must not hide a bad counter by repairing it.
      if (events.some((event) => drift[event] !== 0)) {
        logging.warn(
          `[EmailAnalytics] Newsletter email counter drift: ${JSON.stringify({ emailId, drift })}`,
        );
      }
      try {
        for (const event of events) {
          const comparisons = this.#prometheusClient?.getMetric(
            'email_analytics_email_counter_comparisons',
          );
          const differences = this.#prometheusClient?.getMetric(
            'email_analytics_email_counter_drift',
          );
          if (comparisons && 'inc' in comparisons) {
            comparisons.inc({ event });
          }
          if (differences && 'inc' in differences) {
            differences.inc({ event }, Math.abs(drift[event]));
          }
        }
      } catch (error) {
        logging.error('Error recording newsletter email counter comparison', error);
      }
    }
    return drift;
  }
}
