const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const config = require('../../../shared/config');
const domainEvents = require('@tryghost/domain-events');
/** @import {PrometheusClient} from '@tryghost/prometheus-metrics' */
/** @import {BatchEventProcessor} from './batch-event-processor' */
/** @import {JobNames, CursorSeed} from './email-analytics-service' */

class EmailAnalyticsServiceWrapper {
    /** @type {string} */ #logName;
    #fetching = false;
    #restoredSchedule = false;

    get #logPrefix() {
        return `[EmailAnalytics:${this.#logName}]`;
    }

    /**
     * @param {object} options
     * @param {string} options.logName
     */
    constructor({
        logName,
    }) {
        this.#logName = logName;
    }

    /**
     * @param {object} options
     * @param {Parameters<typeof domainEvents.subscribe>[0]} options.event
     * @param {string[]} options.mailgunTags
     * @param {JobNames} options.jobNames
     * @param {CursorSeed} options.cursorSeed
     * @param {() => BatchEventProcessor} options.createEventProcessor
     * @param {PrometheusClient} [options.prometheusClient]
     */
    init({
        event,
        mailgunTags,
        jobNames,
        cursorSeed,
        createEventProcessor,
        prometheusClient
    }) {
        if (this.service) {
            return;
        }

        const EmailAnalyticsService = require('./email-analytics-service');
        const MailgunProvider = require('./email-analytics-provider-mailgun');
        const settings = require('../../../shared/settings-cache');
        const queries = require('./lib/queries');

        this.service = new EmailAnalyticsService({
            provider: new MailgunProvider({config, settings, tags: mailgunTags}),
            queries,
            prometheusClient,
            jobNames,
            cursorSeed,
            createEventProcessor
        });

        // Log the processing mode on initialization
        const batchProcessingEnabled = config.get('emailAnalytics:batchProcessing');
        logging.info(`${this.#logPrefix} Initialized with ${batchProcessingEnabled ? 'BATCHED' : 'SEQUENTIAL'} processing mode`);

        // We currently cannot trigger a non-offloaded job from the job manager
        // So the email analytics jobs simply emits an event.
        domainEvents.subscribe(event, async () => {
            await this.startFetch();
        });
    }

    /**
     * Log comprehensive job completion with timing metrics
     * @param {string} jobType - Type of job (e.g., 'latest-opened', 'latest', 'missing', 'scheduled')
     * @param {object} fetchResult - The fetch result from EmailAnalyticsService
     * @param {number} totalDurationMs - Total duration in milliseconds
     */
    _logJobCompletion(jobType, fetchResult, totalDurationMs) {
        const {eventCount, apiPollingTimeMs, processingTimeMs, aggregationTimeMs, emailAggregationTimeMs, memberAggregationTimeMs, result} = fetchResult;

        if (eventCount === 0) {
            return;
        }

        const throughput = totalDurationMs > 0 ? eventCount / (totalDurationMs / 1000) : 0;
        const apiPercent = totalDurationMs > 0 ? Math.round((apiPollingTimeMs / totalDurationMs) * 100) : 0;
        const processingPercent = totalDurationMs > 0 ? Math.round((processingTimeMs / totalDurationMs) * 100) : 0;
        const aggregationPercent = totalDurationMs > 0 ? Math.round((aggregationTimeMs / totalDurationMs) * 100) : 0;
        const batchMode = config.get('emailAnalytics:batchProcessing') ? 'BATCHED' : 'SEQUENTIAL';

        const logMessage = [
            `${this.#logPrefix} Job complete: ${jobType}`,
            `${eventCount} events in ${(totalDurationMs / 1000).toFixed(1)}s (${throughput.toFixed(2)} events/s)`,
            `Mode: ${batchMode}`,
            `Timings: API ${(apiPollingTimeMs / 1000).toFixed(1)}s (${apiPercent}%) / Processing ${(processingTimeMs / 1000).toFixed(1)}s (${processingPercent}%) / Aggregation ${(aggregationTimeMs / 1000).toFixed(1)}s (${aggregationPercent}%) [Email ${(emailAggregationTimeMs / 1000).toFixed(1)}s / Member ${(memberAggregationTimeMs / 1000).toFixed(1)}s]`,
            `Events: opened=${result.opened} delivered=${result.delivered} failed=${result.permanentFailed + result.temporaryFailed} unprocessable=${result.unprocessable}`
        ].join(' | ');

        logging.info(logMessage);

        // We're only concerned with open throughput as this is displayed to users and is most sensitive to being up to date
        if (jobType === 'latest-opened') {
            const openThroughputEnabled = config.get('emailAnalytics:metrics:openThroughput:enabled');
            const openThroughputThreshold = config.get('emailAnalytics:metrics:openThroughput:threshold') || 0;
            if (openThroughputEnabled && eventCount >= openThroughputThreshold) {
                const metricName = this.#logName === 'newsletters'
                    ? 'email-analytics-open-throughput'
                    : `email-${this.#logName}-analytics-open-throughput`;
                metrics.metric(metricName, {
                    value: throughput,
                    events: eventCount,
                    duration: totalDurationMs
                });
            }
        }
    }

    async fetchLatestOpenedEvents({maxEvents} = {maxEvents: Infinity}) {
        const beginTimestamp = await this.service.getLastOpenedEventTimestamp();
        const lagMinutes = (Date.now() - beginTimestamp.getTime()) / 60000;
        const lagThreshold = config.get('emailAnalytics:openedJobLagWarningMinutes');

        // NOTE: We only update the begin timestamp when we process events, so there's cases where we can have a false positive
        //  - Ghost or Mailgun outages
        //  - Lack of actual email activity
        if (lagThreshold && lagMinutes > lagThreshold) {
            logging.warn(`${this.#logPrefix} Opened events processing is ${lagMinutes.toFixed(1)} minutes behind (threshold: ${lagThreshold})`);
        }

        const fetchStartedAt = Date.now();
        const fetchResult = await this.service.fetchLatestOpenedEvents({maxEvents});
        const totalDuration = Date.now() - fetchStartedAt;

        this._logJobCompletion('latest-opened', fetchResult, totalDuration);

        return fetchResult.eventCount;
    }

    async fetchLatestNonOpenedEvents({maxEvents} = {maxEvents: Infinity}) {
        const fetchStartedAt = Date.now();
        const fetchResult = await this.service.fetchLatestNonOpenedEvents({maxEvents});
        const totalDuration = Date.now() - fetchStartedAt;

        this._logJobCompletion('latest', fetchResult, totalDuration);

        return fetchResult.eventCount;
    }

    async fetchMissing({maxEvents} = {maxEvents: Infinity}) {
        const fetchStartedAt = Date.now();
        const fetchResult = await this.service.fetchMissing({maxEvents});
        const totalDuration = Date.now() - fetchStartedAt;

        this._logJobCompletion('missing', fetchResult, totalDuration);

        return fetchResult.eventCount;
    }

    async fetchScheduled({maxEvents}) {
        if (maxEvents < 300) {
            return 0;
        }

        const fetchStartedAt = Date.now();
        const fetchResult = await this.service.fetchScheduled({maxEvents});
        const totalDuration = Date.now() - fetchStartedAt;

        this._logJobCompletion('scheduled', fetchResult, totalDuration);

        return fetchResult.eventCount;
    }

    async startFetch() {
        if (!this.#restoredSchedule) {
            this.#restoredSchedule = true;
            await this.service.restoreScheduled();
        }

        if (this.#fetching) {
            logging.info(`Email analytics fetch for ${this.#logName} already running, skipping`);
            return;
        }
        this.#fetching = true;

        // NOTE: Data shows we can process ~2500 events per minute on Pro for a large-ish db (150k members).
        //       This can vary locally, but we should be conservative with the number of events we fetch.
        try {
            // Prioritize opens since they are the most important (only data directly displayed to users)
            const c1 = await this.fetchLatestOpenedEvents({maxEvents: 10000});
            if (c1 >= 10000) {
                this._restartFetch('high opened event count');
                return;
            }

            // Set limits on how much we fetch without checkings for opened events. During surge events (following newsletter send)
            //  we want to make sure we don't spend too much time collecting delivery data.
            const c2 = await this.fetchLatestNonOpenedEvents({maxEvents: 10000 - c1});
            const c3 = await this.fetchMissing({maxEvents: 10000 - c1 - c2});

            // Always restart immediately instead of waiting for the next scheduled job if we're fetching a lot of events
            if ((c1 + c2 + c3) > 10000) {
                this._restartFetch('high event count');
                return;
            }

            // Only backfill if we're not currently fetching a lot of events
            const c4 = await this.fetchScheduled({maxEvents: 10000});
            if (c4 > 0) {
                this._restartFetch('scheduled backfill');
                return;
            }

            // Log summary if no events were found across all jobs
            if (c1 + c2 + c3 + c4 === 0) {
                logging.info(`${this.#logPrefix} Job complete - No events`);
            }

            this.#fetching = false;
        } catch (e) {
            logging.error(e, `Error while fetching email analytics for ${this.#logName}`);

            // Log again only the error, otherwise we lose the stack trace
            logging.error(e);
        }
        this.#fetching = false;
    }

    _restartFetch(reason) {
        this.#fetching = false;
        logging.info(`${this.#logPrefix} Restarting fetch due to ${reason}`);
        this.startFetch();
    }
}

module.exports = EmailAnalyticsServiceWrapper;
