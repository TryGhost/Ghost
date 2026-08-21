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

interface GiftFlushSchedulerOptions {
  apiUrl: string;
  adapter: SchedulerAdapter;
  internalKeys: InternalKeys;
  endpoint: 'flush_reminders' | 'flush_deliveries';
  logEvent: string;
  logMessage: string;
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
  readonly #logEvent: string;
  readonly #logMessage: string;
  readonly #findScheduledTimes: GiftFlushSchedulerOptions['findScheduledTimes'];
  readonly #scheduledTimes = new Set<number>();

  constructor({
    apiUrl,
    adapter,
    internalKeys,
    endpoint,
    logEvent,
    logMessage,
    findScheduledTimes,
  }: GiftFlushSchedulerOptions) {
    this.#apiUrl = apiUrl;
    this.#adapter = adapter;
    this.#internalKeys = internalKeys;
    this.#endpoint = endpoint;
    this.#logEvent = logEvent;
    this.#logMessage = logMessage;
    this.#findScheduledTimes = findScheduledTimes;
    this.#adapter.register(this);
  }

  /**
   * Arm a flush for the given fire time. Already-due times are skipped —
   * the daily gift-cleanup job's recovery pass picks their work up.
   */
  async scheduleAt(time: number, logContext: Record<string, unknown> = {}): Promise<void> {
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

    let key: InternalApiKey;
    try {
      key = await this.#internalKeys.get('ghost-scheduler');
    } catch (err) {
      // Nothing was armed and the time was never marked as scheduled,
      // so a later schedule for the same time retries; the daily
      // gift-cleanup job's recovery pass recovers the work regardless.
      logging.error(
        {
          event: { name: this.#logEvent },
          err,
          ...logContext,
        },
        this.#logMessage,
      );
      return;
    }

    // A concurrent call may have armed this time during the key fetch.
    if (this.#scheduledTimes.has(time)) {
      return;
    }
    this.#scheduledTimes.add(time);

    // schedule() captures failures instead of throwing, so a silent
    // failure leaves the time marked armed; the daily recovery pass sends
    // the work at most a day late.
    this.#adapter.schedule(this.#buildJob(time, key));
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
    const scheduledTimes = new Set(pending);

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
      this.#adapter.schedule(job);
      this.#scheduledTimes.add(time);
    }
  }

  #buildJob(time: number, key: InternalApiKey): SchedulerJob {
    const jobTime = time + FLUSH_DELAY_MS;
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
