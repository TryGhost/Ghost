import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { ConfigInstance } from '../../../shared/config/loader';
// @ts-expect-error This module lacks type definitions.
import type DomainEvents from '@tryghost/domain-events';
import type { GhostMetrics } from '@tryghost/metrics';
import {
  EmailAnalyticsService,
  type CursorSeed,
  type EmailAnalyticsFetchResult,
  type JobNames,
} from './email-analytics-service';
import type { BatchEventProcessor } from './batch-event-processor';
import type { Queries } from './lib/queries';
import { fetchMailgunEvents } from './fetch-mailgun-events';
import { isCanceled, type MailgunRateLimit } from './mailgun-rate-limit';

export class EmailAnalyticsServiceWrapper {
  #logName: string;
  #config?: Pick<ConfigInstance, 'get'>;
  #metrics?: Pick<GhostMetrics, 'metric'>;
  #service?: EmailAnalyticsService;
  #fetching = false;
  #restoredSchedule = false;
  #fetchOpenedEvents = true;
  #stopping = false;
  // Bumped by init() so a run interrupted before a reinitialization cannot
  // continue into the new service once #stopping is cleared.
  #generation = 0;
  #activeFetches = new Set<Promise<void>>();
  #abortController = new AbortController();

  get #logPrefix(): string {
    return `[EmailAnalytics:${this.#logName}]`;
  }

  get #backgroundJobName(): string {
    switch (this.#logName) {
      case 'newsletters':
        return 'email-analytics-fetch-latest';
      case 'automations':
        return 'email-analytics-automation-fetch-latest';
      case 'gifts':
        return 'email-analytics-gift-fetch-latest';
      default:
        return `email-analytics-${this.#logName}-fetch-latest`;
    }
  }

  constructor({ logName }: { logName: string }) {
    this.#logName = logName;
  }

  init({
    config,
    domainEvents,
    event,
    queries,
    mailgunTags,
    jobNames,
    cursorSeed,
    createEventProcessor,
    metrics,
    settingsCache,
    rateLimiter,
  }: Readonly<{
    config: Pick<ConfigInstance, 'get'>;
    domainEvents: Pick<DomainEvents, 'subscribe'>;
    event: Parameters<DomainEvents['subscribe']>[0];
    queries: Queries;
    mailgunTags: string[];
    jobNames: JobNames;
    cursorSeed: CursorSeed;
    createEventProcessor: () => BatchEventProcessor;
    metrics: Pick<GhostMetrics, 'metric'>;
    settingsCache: { get: (key: string) => unknown };
    rateLimiter?: MailgunRateLimit;
  }>): void {
    const initialized = Boolean(this.#service);
    if (initialized && !this.#stopping) {
      return;
    }
    if (this.#activeFetches.size) {
      // A stop that failed before its cleanup ran leaves aborted fetches
      // winding down; they exit at their next check and must not block boot.
      logging.warn(
        `${this.#logPrefix} reinitializing while ${this.#activeFetches.size} interrupted fetch(es) drain`,
      );
    }
    this.#stopping = false;
    this.#generation += 1;
    this.#abortController = new AbortController();
    this.#fetching = false;
    this.#restoredSchedule = false;

    this.#config = config;
    this.#metrics = metrics;
    this.#fetchOpenedEvents = Boolean(cursorSeed.eventColumns.opened);

    this.#service = new EmailAnalyticsService({
      signal: this.#abortController.signal,
      fetchEvents: (options) =>
        fetchMailgunEvents({
          ...options,
          config,
          settings: settingsCache,
          tags: mailgunTags,
          rateLimiter,
        }),
      queries,
      jobNames,
      cursorSeed,
      createEventProcessor,
    });

    // Log the processing mode on initialization
    const batchProcessingEnabled = this.#config.get('emailAnalytics:batchProcessing');
    logging.info(
      `${this.#logPrefix} Initialized with ${batchProcessingEnabled ? 'BATCHED' : 'SEQUENTIAL'} processing mode`,
    );

    // We currently cannot trigger a non-offloaded job from the job manager
    // So the email analytics jobs simply emits an event.
    if (!initialized) {
      domainEvents.subscribe(event, async () => {
        await this.startFetch();
      });
    }
  }

  get service(): EmailAnalyticsService {
    const result = this.#service;
    if (!result) {
      throw new errors.InternalServerError({
        message: 'EmailAnalyticsServiceWrapper is not initialized with service',
      });
    }
    return result;
  }

  #getConfig(): Pick<ConfigInstance, 'get'> {
    const result = this.#config;
    if (!result) {
      throw new errors.InternalServerError({
        message: 'EmailAnalyticsServiceWrapper is not initialized with config',
      });
    }
    return result;
  }

  _logJobCompletion(
    jobType: string,
    fetchResult: EmailAnalyticsFetchResult,
    totalDurationMs: number,
  ): void {
    const config = this.#getConfig();

    const {
      eventCount,
      apiPollingTimeMs,
      processingTimeMs,
      aggregationTimeMs,
      emailAggregationTimeMs,
      memberAggregationTimeMs,
      result,
    } = fetchResult;

    if (eventCount === 0) {
      return;
    }

    const throughput = totalDurationMs > 0 ? eventCount / (totalDurationMs / 1000) : 0;
    const apiPercent =
      totalDurationMs > 0 ? Math.round((apiPollingTimeMs / totalDurationMs) * 100) : 0;
    const processingPercent =
      totalDurationMs > 0 ? Math.round((processingTimeMs / totalDurationMs) * 100) : 0;
    const aggregationPercent =
      totalDurationMs > 0 ? Math.round((aggregationTimeMs / totalDurationMs) * 100) : 0;
    const batchMode = config.get('emailAnalytics:batchProcessing') ? 'BATCHED' : 'SEQUENTIAL';

    const logMessage = [
      `[Background Job] ${this.#backgroundJobName} processed ${jobType} | ${this.#logPrefix}`,
      `${eventCount} events in ${(totalDurationMs / 1000).toFixed(1)}s (${throughput.toFixed(2)} events/s)`,
      `Mode: ${batchMode}`,
      `Timings: API ${(apiPollingTimeMs / 1000).toFixed(1)}s (${apiPercent}%) / Processing ${(processingTimeMs / 1000).toFixed(1)}s (${processingPercent}%) / Aggregation ${(aggregationTimeMs / 1000).toFixed(1)}s (${aggregationPercent}%) [Email ${(emailAggregationTimeMs / 1000).toFixed(1)}s / Member ${(memberAggregationTimeMs / 1000).toFixed(1)}s]`,
      `Events: opened=${result.opened} delivered=${result.delivered} failed=${result.permanentFailed + result.temporaryFailed} unprocessable=${result.unprocessable}`,
    ].join(' | ');

    logging.info(
      {
        system: {
          event: 'job.completed',
          job_type: this.#backgroundJobName,
          task: jobType,
          event_count: eventCount,
          duration_ms: totalDurationMs,
        },
      },
      logMessage,
    );

    // We're only concerned with open throughput as this is displayed to users and is most sensitive to being up to date
    if (jobType === 'latest-opened') {
      const openThroughputEnabled = config.get('emailAnalytics:metrics:openThroughput:enabled');
      const openThroughputThreshold =
        config.get('emailAnalytics:metrics:openThroughput:threshold') || 0;
      if (openThroughputEnabled && eventCount >= openThroughputThreshold) {
        const metricName =
          this.#logName === 'newsletters'
            ? 'email-analytics-open-throughput'
            : `email-${this.#logName}-analytics-open-throughput`;

        const metrics = this.#metrics;
        if (!metrics) {
          throw new errors.InternalServerError({
            message: 'EmailAnalyticsServiceWrapper is not initialized with metrics',
          });
        }
        metrics.metric(metricName, {
          value: throughput,
          events: eventCount,
          duration: totalDurationMs,
        });
      }
    }
  }

  async fetchLatestOpenedEvents({
    maxEvents = Infinity,
  }: { maxEvents?: number } = {}): Promise<number> {
    const config = this.#getConfig();

    const beginTimestamp = await this.service.getLastOpenedEventTimestamp();
    const lagMinutes = (Date.now() - beginTimestamp.getTime()) / 60000;
    const lagThreshold = config.get('emailAnalytics:openedJobLagWarningMinutes');

    // NOTE: We only update the begin timestamp when we process events, so there's cases where we can have a false positive
    //  - Ghost or Mailgun outages
    //  - Lack of actual email activity
    if (lagThreshold && lagMinutes > lagThreshold) {
      logging.warn(
        `${this.#logPrefix} Opened events processing is ${lagMinutes.toFixed(1)} minutes behind (threshold: ${lagThreshold})`,
      );
    }

    const fetchStartedAt = Date.now();
    const fetchResult = await this.service.fetchLatestOpenedEvents({ maxEvents });
    const totalDuration = Date.now() - fetchStartedAt;

    this._logJobCompletion('latest-opened', fetchResult, totalDuration);

    return fetchResult.eventCount;
  }

  async fetchLatestNonOpenedEvents({
    maxEvents = Infinity,
  }: { maxEvents?: number } = {}): Promise<number> {
    const fetchStartedAt = Date.now();
    const fetchResult = await this.service.fetchLatestNonOpenedEvents({ maxEvents });
    const totalDuration = Date.now() - fetchStartedAt;

    this._logJobCompletion('latest', fetchResult, totalDuration);

    return fetchResult.eventCount;
  }

  async fetchMissing({ maxEvents = Infinity }: { maxEvents?: number } = {}): Promise<number> {
    const fetchStartedAt = Date.now();
    const fetchResult = await this.service.fetchMissing({ maxEvents });
    const totalDuration = Date.now() - fetchStartedAt;

    this._logJobCompletion('missing', fetchResult, totalDuration);

    return fetchResult.eventCount;
  }

  async fetchScheduled({ maxEvents }: { maxEvents: number }): Promise<number> {
    if (maxEvents < 300) {
      return 0;
    }

    const fetchStartedAt = Date.now();
    const fetchResult = await this.service.fetchScheduled({ maxEvents });
    const totalDuration = Date.now() - fetchStartedAt;

    this._logJobCompletion('scheduled', fetchResult, totalDuration);

    return fetchResult.eventCount;
  }

  onPreStop(): void {
    this.#stopping = true;
    this.#abortController.abort();
  }

  async onShutdown(): Promise<void> {
    this.onPreStop();
    await Promise.allSettled(this.#activeFetches);
  }

  startFetch(): Promise<void> {
    if (this.#stopping) {
      return Promise.resolve();
    }
    const run = this.#startFetch();
    this.#activeFetches.add(run);
    // Observe both outcomes without detaching a rejecting finally() promise.
    void run.then(
      () => this.#activeFetches.delete(run),
      () => this.#activeFetches.delete(run),
    );
    return run;
  }

  #stopped(generation: number): boolean {
    return this.#stopping || generation !== this.#generation;
  }

  async #startFetch(): Promise<void> {
    const startedAt = Date.now();
    const generation = this.#generation;
    if (!this.#restoredSchedule) {
      this.#restoredSchedule = true;
      try {
        await this.service.restoreScheduled();
      } catch (e) {
        logging.error(
          e,
          `[Background Job] ${this.#backgroundJobName} failed while restoring scheduled events after ${Date.now() - startedAt}ms`,
        );
        throw e;
      }
    }

    if (this.#stopped(generation)) {
      return;
    }
    if (this.#fetching) {
      logging.info(
        `[Background Job] ${this.#backgroundJobName} skipped because a fetch is already running`,
      );
      return;
    }
    this.#fetching = true;

    // NOTE: Data shows we can process ~2500 events per minute on Pro for a large-ish db (150k members).
    //       This can vary locally, but we should be conservative with the number of events we fetch.
    try {
      // Prioritize opens since they are the most important (only data directly displayed to users)
      const c1 = this.#fetchOpenedEvents
        ? await this.fetchLatestOpenedEvents({ maxEvents: 10000 })
        : 0;
      if (this.#stopped(generation)) {
        this.#clearFetching(generation);
        return;
      }
      if (c1 >= 10000) {
        this._restartFetch('high opened event count');
        return;
      }

      // Set limits on how much we fetch without checkings for opened events. During surge events (following newsletter send)
      //  we want to make sure we don't spend too much time collecting delivery data.
      const c2 = await this.fetchLatestNonOpenedEvents({ maxEvents: 10000 - c1 });
      if (this.#stopped(generation)) {
        this.#clearFetching(generation);
        return;
      }
      const c3 = await this.fetchMissing({ maxEvents: 10000 - c1 - c2 });
      if (this.#stopped(generation)) {
        this.#clearFetching(generation);
        return;
      }

      // Always restart immediately instead of waiting for the next scheduled job if we're fetching a lot of events
      if (c1 + c2 + c3 > 10000) {
        this._restartFetch('high event count');
        return;
      }

      // Only backfill if we're not currently fetching a lot of events
      const c4 = await this.fetchScheduled({ maxEvents: 10000 });
      if (this.#stopped(generation)) {
        this.#clearFetching(generation);
        return;
      }
      if (c4 > 0) {
        this._restartFetch('scheduled backfill');
        return;
      }

      logging.info(
        `[Background Job] ${this.#backgroundJobName} completed in ${Date.now() - startedAt}ms with ${c1 + c2 + c3 + c4} events | ${this.#logPrefix}`,
      );

      this.#fetching = false;
    } catch (e) {
      if (this.#stopped(generation) && isCanceled(e)) {
        // A planned stop is not a job failure; the window is kept for replay.
        logging.info(
          `[Background Job] ${this.#backgroundJobName} stopped for shutdown after ${Date.now() - startedAt}ms`,
        );
      } else {
        logging.error(
          e,
          `[Background Job] ${this.#backgroundJobName} failed after ${Date.now() - startedAt}ms`,
        );

        // Log again only the error, otherwise we lose the stack trace
        logging.error(e);
      }
    }
    this.#clearFetching(generation);
  }

  #clearFetching(generation: number): void {
    // A run from before a reinitialization must not clear the new run's flag.
    if (generation === this.#generation) {
      this.#fetching = false;
    }
  }

  _restartFetch(reason: string): void {
    this.#fetching = false;
    logging.info(`[Background Job] ${this.#backgroundJobName} continuing due to ${reason}`);
    this.startFetch();
  }
}
