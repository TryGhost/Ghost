const defaultLogging = require('@tryghost/logging');
const defaultMetrics = require('@tryghost/metrics');
const defaultConfig = require('../../../../shared/config');

const DEFAULT_MAX_EVENTS = 10000;

class EmailAnalyticsRunner {
    #restoredSchedule = false;
    #fetching = false;

    constructor({adapter, logging = defaultLogging, metrics = defaultMetrics, config = defaultConfig, maxEvents = DEFAULT_MAX_EVENTS}) {
        this.adapter = adapter;
        this.logging = logging;
        this.metrics = metrics;
        this.config = config;
        this.maxEvents = maxEvents;
    }

    async start() {
        if (!this.#restoredSchedule) {
            this.#restoredSchedule = true;
            if (this.adapter.restoreScheduled) {
                await this.adapter.restoreScheduled();
            }
        }

        if (this.#fetching) {
            this.logging.info('Email analytics fetch already running, skipping');
            return;
        }
        this.#fetching = true;

        try {
            const openedResult = await this.fetchAndLogCompletion('latest-opened', async () => {
                return await this.adapter.fetchLatestOpenedEvents({maxEvents: this.maxEvents});
            });
            const openedEventCount = this._getEventCount(openedResult);
            if (openedEventCount >= this.maxEvents) {
                this._restartFetch('high opened event count');
                return;
            }

            const nonOpenedResult = await this.fetchAndLogCompletion('latest', async () => {
                return await this.adapter.fetchLatestNonOpenedEvents({
                    maxEvents: this.maxEvents - openedEventCount
                });
            });
            const nonOpenedEventCount = this._getEventCount(nonOpenedResult);
            const missingResult = await this.fetchAndLogCompletion('missing', async () => {
                return await this.adapter.fetchMissing({
                    maxEvents: this.maxEvents - openedEventCount - nonOpenedEventCount
                });
            });
            const missingEventCount = this._getEventCount(missingResult);

            if ((openedEventCount + nonOpenedEventCount + missingEventCount) > this.maxEvents) {
                this._restartFetch('high event count');
                return;
            }

            const scheduledResult = this.adapter.fetchScheduled ? await this.fetchAndLogCompletion('scheduled', async () => {
                return await this.adapter.fetchScheduled({
                    maxEvents: this.maxEvents
                });
            }) : 0;
            const scheduledEventCount = this._getEventCount(scheduledResult);

            if (scheduledEventCount > 0) {
                this._restartFetch('scheduled backfill');
                return;
            }

            if (openedEventCount + nonOpenedEventCount + missingEventCount + scheduledEventCount === 0) {
                this.logging.info('[EmailAnalytics] Job complete - No events');
            }

            this.#fetching = false;
        } catch (e) {
            this.logging.error(e, 'Error while fetching email analytics');
            this.logging.error(e);
        }
        this.#fetching = false;
    }

    async fetchAndLogCompletion(jobType, fetchEvents) {
        const fetchStartDate = new Date();
        const fetchResult = await fetchEvents();
        const totalDuration = Date.now() - fetchStartDate.getTime();

        this._logJobCompletion(jobType, fetchResult, totalDuration);

        return fetchResult;
    }

    _getEventCount(fetchResult) {
        if (typeof fetchResult === 'number') {
            return fetchResult;
        }

        return fetchResult?.eventCount || 0;
    }

    _normalizeFetchResult(fetchResult) {
        if (typeof fetchResult === 'number') {
            return {
                eventCount: fetchResult,
                apiPollingTimeMs: 0,
                processingTimeMs: 0,
                aggregationTimeMs: 0,
                emailAggregationTimeMs: 0,
                memberAggregationTimeMs: 0,
                result: {}
            };
        }

        return {
            eventCount: fetchResult?.eventCount || 0,
            apiPollingTimeMs: fetchResult?.apiPollingTimeMs || 0,
            processingTimeMs: fetchResult?.processingTimeMs || 0,
            aggregationTimeMs: fetchResult?.aggregationTimeMs || 0,
            emailAggregationTimeMs: fetchResult?.emailAggregationTimeMs || 0,
            memberAggregationTimeMs: fetchResult?.memberAggregationTimeMs || 0,
            result: fetchResult?.result || {}
        };
    }

    _formatEventCounts(result) {
        const eventCounts = [
            `opened=${result.opened || 0}`,
            `delivered=${result.delivered || 0}`
        ];

        if (Object.prototype.hasOwnProperty.call(result, 'permanentFailed') || Object.prototype.hasOwnProperty.call(result, 'temporaryFailed')) {
            eventCounts.push(`failed=${(result.permanentFailed || 0) + (result.temporaryFailed || 0)}`);
        }

        if (Object.prototype.hasOwnProperty.call(result, 'unprocessable')) {
            eventCounts.push(`unprocessable=${result.unprocessable || 0}`);
        }

        if (Object.prototype.hasOwnProperty.call(result, 'noop')) {
            eventCounts.push(`noop=${result.noop || 0}`);
        }

        return eventCounts.join(' ');
    }

    /**
     * Log comprehensive job completion with timing metrics.
     * @param {string} jobType - Type of job (e.g., 'latest-opened', 'latest', 'missing', 'scheduled')
     * @param {object|number} fetchResult - The fetch result from the pipeline adapter
     * @param {number} totalDurationMs - Total duration in milliseconds
     */
    _logJobCompletion(jobType, fetchResult, totalDurationMs) {
        const {eventCount, apiPollingTimeMs, processingTimeMs, aggregationTimeMs, emailAggregationTimeMs, memberAggregationTimeMs, result} = this._normalizeFetchResult(fetchResult);

        if (eventCount === 0) {
            return;
        }

        const throughput = totalDurationMs > 0 ? eventCount / (totalDurationMs / 1000) : 0;
        const apiPercent = totalDurationMs > 0 ? Math.round((apiPollingTimeMs / totalDurationMs) * 100) : 0;
        const processingPercent = totalDurationMs > 0 ? Math.round((processingTimeMs / totalDurationMs) * 100) : 0;
        const aggregationPercent = totalDurationMs > 0 ? Math.round((aggregationTimeMs / totalDurationMs) * 100) : 0;
        const batchMode = this.config.get('emailAnalytics:batchProcessing') ? 'BATCHED' : 'SEQUENTIAL';
        const pipelineName = this.adapter.name || 'unknown';

        const logMessage = [
            `[EmailAnalytics] Job complete: ${jobType}`,
            `Pipeline: ${pipelineName}`,
            `${eventCount} events in ${(totalDurationMs / 1000).toFixed(1)}s (${throughput.toFixed(2)} events/s)`,
            `Mode: ${batchMode}`,
            `Timings: API ${(apiPollingTimeMs / 1000).toFixed(1)}s (${apiPercent}%) / Processing ${(processingTimeMs / 1000).toFixed(1)}s (${processingPercent}%) / Aggregation ${(aggregationTimeMs / 1000).toFixed(1)}s (${aggregationPercent}%) [Email ${(emailAggregationTimeMs / 1000).toFixed(1)}s / Member ${(memberAggregationTimeMs / 1000).toFixed(1)}s]`,
            `Events: ${this._formatEventCounts(result)}`
        ].join(' | ');

        this.logging.info(logMessage);

        // We're only concerned with newsletter open throughput as this is displayed to users and is most sensitive to being up to date.
        if (pipelineName === 'newsletter' && jobType === 'latest-opened') {
            const openThroughputEnabled = this.config.get('emailAnalytics:metrics:openThroughput:enabled');
            const openThroughputThreshold = this.config.get('emailAnalytics:metrics:openThroughput:threshold') || 0;
            if (openThroughputEnabled && eventCount >= openThroughputThreshold) {
                this.metrics.metric('email-analytics-open-throughput', {
                    value: throughput,
                    events: eventCount,
                    duration: totalDurationMs
                });
            }
        }
    }

    _restartFetch(reason) {
        this.#fetching = false;

        if (this.adapter.restartFetch) {
            this.adapter.restartFetch(reason);
            return;
        }

        this.logging.info(`[EmailAnalytics] Restarting fetch due to ${reason}`);
        this.start();
    }
}

module.exports = EmailAnalyticsRunner;
