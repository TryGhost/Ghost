import logging from '@tryghost/logging';
import type { SchedulerAdapter, SchedulerJob } from '@tryghost/adapter-base-scheduling';
import type { InternalApiKey, InternalKeys } from '../internal-keys';

const urlUtils = require('../../../shared/url-utils').default;
const { getSignedAdminToken } = require('../../adapters/scheduling/utils');

// The default scheduling adapter can ping up to 50ms before the scheduled
// time, and the flush queries truncate "now" to whole seconds — an exactly
// on-time job could find nothing due and be consumed without sending
// anything. Arming each job just past its second avoids that.
const FLUSH_DELAY_MS = 1000;

function normalizeTime(time: number): number {
  return Math.floor(time / 1000) * 1000;
}

interface GiftFlushSchedulerOptions {
  apiUrl: string;
  adapter: SchedulerAdapter;
  internalKeys: InternalKeys;
  endpoint: 'flush_reminders' | 'flush_deliveries';
  // snake_case identifier used to derive log event names and messages.
  name: string;
  // Times (ms since epoch) still needing a flush job, used to rebuild the
  // adapter queue at boot and on key rotation.
  findScheduledTimes(): Promise<number[]>;
}

/**
 * Arms one-shot Admin API flush callbacks through the scheduling adapter,
 * deduplicated by fire time.
 */
export class GiftFlushScheduler {
  readonly #apiUrl: string;
  readonly #adapter: SchedulerAdapter;
  readonly #internalKeys: InternalKeys;
  readonly #endpoint: GiftFlushSchedulerOptions['endpoint'];
  readonly #name: string;
  readonly #findScheduledTimes: GiftFlushSchedulerOptions['findScheduledTimes'];
  readonly #scheduledTimes = new Set<number>();

  constructor({
    apiUrl,
    adapter,
    internalKeys,
    endpoint,
    name,
    findScheduledTimes,
  }: GiftFlushSchedulerOptions) {
    this.#apiUrl = apiUrl;
    this.#adapter = adapter;
    this.#internalKeys = internalKeys;
    this.#endpoint = endpoint;
    this.#name = name;
    this.#findScheduledTimes = findScheduledTimes;
    this.#adapter.register(this);
  }

  /**
   * Arm a flush for the given fire time. Already-due work is left to the
   * daily recovery jobs.
   */
  async scheduleAt(time: number, logContext: Record<string, unknown> = {}): Promise<void> {
    time = normalizeTime(time);
    const now = Date.now();
    if (time <= now) {
      return;
    }

    // Prune elapsed one-shot times so the set can't grow for the process
    // lifetime.
    for (const armed of this.#scheduledTimes) {
      if (armed <= now) {
        this.#scheduledTimes.delete(armed);
      }
    }

    if (this.#scheduledTimes.has(time)) {
      return;
    }

    try {
      const key = await this.#internalKeys.get('ghost-scheduler');

      // A concurrent call may have armed this time during the key fetch.
      if (this.#scheduledTimes.has(time)) {
        return;
      }

      const job = this.#buildJob(time, key);
      this.#scheduledTimes.add(time);

      // schedule() captures asynchronous failures instead of throwing, so a
      // silent failure leaves the time marked armed; the daily recovery pass
      // sends the work at most a day late.
      this.#adapter.schedule(job);
    } catch (err) {
      // A synchronous key, job-construction, or adapter failure must not escape
      // into the completed gift flow. Remove any marker so a later call can
      // retry; daily recovery handles the work if it does not.
      this.#scheduledTimes.delete(time);
      logging.error(
        {
          event: { name: `${this.#name}_scheduler.schedule.failed` },
          err,
          ...logContext,
        },
        `Failed to schedule ${this.#name.replaceAll('_', ' ')}`,
      );
    }
  }

  /**
   * Rebuilds pending flushes under the current key, unscheduling
   * previous-key jobs during rotation; recovery handles elapsed times.
   */
  async rescheduleAll({ previousKey }: { previousKey?: InternalApiKey } = {}): Promise<void> {
    const currentKey = await this.#internalKeys.get('ghost-scheduler');
    const pending = await this.#findScheduledTimes();

    // On boot, unscheduling an identical URL and time would tombstone the
    // rebuilt job; only key rotation has a distinct stale URL to
    // unschedule.
    const bootstrap = !previousKey;
    const scheduledTimes = new Set(pending.map(normalizeTime));

    this.#scheduledTimes.clear();

    for (const time of scheduledTimes) {
      if (time <= Date.now()) {
        continue;
      }
      const job = this.#buildJob(time, currentKey);
      // Reuse the boot job so correctness doesn't depend on token
      // signing being deterministic.
      const staleJob = previousKey ? this.#buildJob(time, previousKey) : job;
      this.#adapter.unschedule(staleJob, { bootstrap });

      // Before GiftFlushScheduler, reminder jobs were armed without the
      // one-second flush delay. During the first scheduler-key rotation after
      // an upgrade, tombstone that legacy URL+time as well.
      if (previousKey && this.#endpoint === 'flush_reminders') {
        this.#adapter.unschedule(this.#buildJob(time, previousKey, 0), { bootstrap });
      }

      this.#adapter.schedule(job);
      this.#scheduledTimes.add(time);
    }
  }

  #buildJob(time: number, key: InternalApiKey, delayMs = FLUSH_DELAY_MS): SchedulerJob {
    const jobTime = time + delayMs;
    const signedAdminToken = getSignedAdminToken({
      publishedAt: new Date(jobTime).toISOString(),
      apiUrl: this.#apiUrl,
      key,
    });
    const url = new URL(urlUtils.urlJoin(this.#apiUrl, 'gifts', this.#endpoint));
    url.searchParams.set('token', signedAdminToken);
    return { time: jobTime, url: url.toString(), extra: { httpMethod: 'PUT' } };
  }
}
