import logging from '@tryghost/logging';
import type { ConfigInstance } from '../../../shared/config/loader';
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

export class EmailAnalyticsServiceWrapper {
  #logName: string;
  readonly #jobType: string;
  readonly #completionEvent: string;
  readonly #config: Pick<ConfigInstance, 'get'>;
  readonly #metrics: Pick<GhostMetrics, 'metric'>;
  readonly #service: EmailAnalyticsService;
  #fetching = false;
  #restoredSchedule = false;
  #fetchOpenedEvents = true;

  get #logPrefix(): string {
    return `[EmailAnalytics:${this.#logName}]`;
  }

  constructor({
    logName,
    jobType,
    config,
    queries,
    mailgunTags,
    jobNames,
    cursorSeed,
    createEventProcessor,
    metrics,
    settingsCache,
  }: Readonly<{
    config: Pick<ConfigInstance, 'get'>;
    logName: string;
    jobType: string;
    queries: Queries;
    mailgunTags: string[];
    jobNames: JobNames;
    cursorSeed: CursorSeed;
    createEventProcessor: () => BatchEventProcessor;
    metrics: Pick<GhostMetrics, 'metric'>;
    settingsCache: { get: (key: string) => unknown };
  }>) {
    this.#logName = logName;
    this.#jobType = jobType;
    this.#completionEvent = `${jobType.replaceAll('-', '_')}.completed`;

    this.#config = config;
    this.#metrics = metrics;
    this.#fetchOpenedEvents = Boolean(cursorSeed.eventColumns.opened);

    this.#service = new EmailAnalyticsService({
      fetchEvents: (options) =>
        fetchMailgunEvents({ ...options, config, settings: settingsCache, tags: mailgunTags }),
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
  }

  get service(): EmailAnalyticsService {
    return this.#service;
  }

  _logJobCompletion(
    jobType: string,
    fetchResult: EmailAnalyticsFetchResult,
    totalDurationMs: number,
    lagSeconds: number | null = null,
  ): void {
    const config = this.#config;

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
      `[Background Job] ${this.#jobType} processed ${jobType} | ${this.#logPrefix}`,
      `${eventCount} events in ${(totalDurationMs / 1000).toFixed(1)}s (${throughput.toFixed(2)} events/s)`,
      ...(lagSeconds === null ? [] : [`Lag: ${(lagSeconds / 60).toFixed(1)}m`]),
      `Mode: ${batchMode}`,
      `Timings: API ${(apiPollingTimeMs / 1000).toFixed(1)}s (${apiPercent}%) / Processing ${(processingTimeMs / 1000).toFixed(1)}s (${processingPercent}%) / Aggregation ${(aggregationTimeMs / 1000).toFixed(1)}s (${aggregationPercent}%) [Email ${(emailAggregationTimeMs / 1000).toFixed(1)}s / Member ${(memberAggregationTimeMs / 1000).toFixed(1)}s]`,
      `Events: opened=${result.opened} delivered=${result.delivered} failed=${result.permanentFailed + result.temporaryFailed} unprocessable=${result.unprocessable}`,
    ].join(' | ');

    logging.info(
      {
        system: {
          event: 'job.completed',
          job_type: this.#jobType,
          task: jobType,
          event_count: eventCount,
          duration_ms: totalDurationMs,
          ...(lagSeconds === null ? {} : { lag_seconds: lagSeconds }),
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

        this.#metrics.metric(metricName, {
          value: throughput,
          events: eventCount,
          duration: totalDurationMs,
        });
      }
    }
  }

  async #fetchAndLog(
    jobType: string,
    fetch: () => Promise<EmailAnalyticsFetchResult>,
    lagPipeline?: 'latestOpened' | 'latest',
  ): Promise<number> {
    const fetchStartedAt = Date.now();
    const fetchResult = await fetch();
    const totalDuration = Date.now() - fetchStartedAt;

    // Lag is read after the fetch so a clean run counts as caught up
    const lagSeconds = lagPipeline ? this.service.getStatus()[lagPipeline].lagSeconds : null;
    this._logJobCompletion(jobType, fetchResult, totalDuration, lagSeconds);

    return fetchResult.eventCount;
  }

  async fetchLatestOpenedEvents({
    maxEvents = Infinity,
  }: { maxEvents?: number } = {}): Promise<number> {
    return this.#fetchAndLog(
      'latest-opened',
      () => this.service.fetchLatestOpenedEvents({ maxEvents }),
      'latestOpened',
    );
  }

  async fetchLatestNonOpenedEvents({
    maxEvents = Infinity,
  }: { maxEvents?: number } = {}): Promise<number> {
    return this.#fetchAndLog(
      'latest',
      () => this.service.fetchLatestNonOpenedEvents({ maxEvents }),
      'latest',
    );
  }

  async fetchMissing({ maxEvents = Infinity }: { maxEvents?: number } = {}): Promise<number> {
    // The missing-events sweep trails the delivery pipeline by design, so it has no lag of its own
    return this.#fetchAndLog('missing', () => this.service.fetchMissing({ maxEvents }));
  }

  async fetchScheduled({ maxEvents }: { maxEvents: number }): Promise<number> {
    if (maxEvents < 300) {
      return 0;
    }

    return this.#fetchAndLog('scheduled', () => this.service.fetchScheduled({ maxEvents }));
  }

  async startFetch(): Promise<void> {
    const startedAt = Date.now();
    if (!this.#restoredSchedule) {
      this.#restoredSchedule = true;
      try {
        await this.service.restoreScheduled();
      } catch (e) {
        logging.error(
          e,
          `[Background Job] ${this.#jobType} failed while restoring scheduled events after ${Date.now() - startedAt}ms`,
        );
        throw e;
      }
    }

    if (this.#fetching) {
      logging.info(`[Background Job] ${this.#jobType} skipped because a fetch is already running`);
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
      if (c1 >= 10000) {
        this._restartFetch('high opened event count');
        return;
      }

      // Set limits on how much we fetch without checkings for opened events. During surge events (following newsletter send)
      //  we want to make sure we don't spend too much time collecting delivery data.
      const c2 = await this.fetchLatestNonOpenedEvents({ maxEvents: 10000 - c1 });
      const c3 = await this.fetchMissing({ maxEvents: 10000 - c1 - c2 });

      // Always restart immediately instead of waiting for the next scheduled job if we're fetching a lot of events
      if (c1 + c2 + c3 > 10000) {
        this._restartFetch('high event count');
        return;
      }

      // Only backfill if we're not currently fetching a lot of events
      const c4 = await this.fetchScheduled({ maxEvents: 10000 });
      if (c4 > 0) {
        this._restartFetch('scheduled backfill');
        return;
      }

      // The message is unchanged so existing log queries keep matching; the
      // structured fields are additive.
      logging.info(
        {
          system: {
            event: this.#completionEvent,
            event_count: c1 + c2 + c3 + c4,
            duration_ms: Date.now() - startedAt,
          },
        },
        `[Background Job] ${this.#jobType} completed in ${Date.now() - startedAt}ms with ${c1 + c2 + c3 + c4} events | ${this.#logPrefix}`,
      );

      this.#fetching = false;
    } catch (e) {
      logging.error(
        e,
        `[Background Job] ${this.#jobType} failed after ${Date.now() - startedAt}ms`,
      );

      // Log again only the error, otherwise we lose the stack trace
      logging.error(e);
    }
    this.#fetching = false;
  }

  _restartFetch(reason: string): void {
    this.#fetching = false;
    logging.info(`[Background Job] ${this.#jobType} continuing due to ${reason}`);
    this.startFetch();
  }
}
