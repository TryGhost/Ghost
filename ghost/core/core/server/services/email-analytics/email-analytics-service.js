const {EventProcessingResult} = require('./event-processing-result');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * @typedef {object} FetchData
 * @property {boolean} running
 * @property {string} jobName Name of the job that is running
 * @property {Date} [lastStarted] Date the last fetch started on
 * @property {Date} [lastBegin] The begin time used during the last fetch
 * @property {Date} [lastEventTimestamp]
 * @property {boolean} [canceled] Set to quit the job early
 */

/**
 * @typedef {FetchData & {schedule?: {begin: Date, end: Date}}} FetchDataScheduled
 */

/**
 * @typedef {(events: object[], result: EventProcessingResult, fetchData: FetchData) => Promise<void>} ProcessEventBatch
 */

/**
 * Optional hook a pipeline provides to roll processed events up into aggregate
 * stat tables. Called after each batch (force=false) and once when the fetch
 * finishes (force=true). Pipelines that aggregate inline while processing (e.g.
 * automations) simply omit it.
 * @typedef {(options: {includeOpenedEvents: boolean, force: boolean}) => Promise<{emailAggregationTimeMs: number, memberAggregationTimeMs: number}>} Flush
 */

/**
 * @typedef {{tableName: string, eventColumns: Partial<Record<EmailAnalyticsEvent, string>>}} EmailAnalyticsEventSource
 */

/**
 * @typedef {'delivered' | 'opened' | 'failed' | 'unsubscribed' | 'complained'} EmailAnalyticsEvent
 */

/**
 * @typedef {object} EmailAnalyticsFetchResult
 * @property {number} eventCount - The number of events fetched
 * @property {number} apiPollingTimeMs - Time spent polling the API in milliseconds
 * @property {number} processingTimeMs - Time spent processing events in milliseconds
 * @property {number} aggregationTimeMs - Time spent aggregating stats in milliseconds
 * @property {number} emailAggregationTimeMs - Time spent aggregating email stats in milliseconds
 * @property {number} memberAggregationTimeMs - Time spent aggregating member stats in milliseconds
 * @property {EventProcessingResult} result - The processing result with event breakdown
 */

const TRUST_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_LATEST_END_MARGIN_MS = 1 * 60 * 1000; // Do not fetch events newer than 1 minute (yet). Reduces the chance of having missed events in fetchLatest.

/**
 * Helper function to create an empty fetch result
 * @returns {EmailAnalyticsFetchResult}
 */
function createEmptyResult() {
    return {
        eventCount: 0,
        apiPollingTimeMs: 0,
        processingTimeMs: 0,
        aggregationTimeMs: 0,
        emailAggregationTimeMs: 0,
        memberAggregationTimeMs: 0,
        result: new EventProcessingResult()
    };
}

module.exports = class EmailAnalyticsService {
    queries;
    provider;

    /**
     * @type {FetchData}
     */
    #fetchLatestNonOpenedData;

    /**
     * @type {FetchData}
     */
    #fetchMissingData;

    /**
     * @type {FetchData}
     */
    #fetchLatestOpenedData;

    /**
     * @type {FetchDataScheduled}
     */
    #fetchScheduledData;

    #jobNames;
    /** @type {EmailAnalyticsEventSource} */
    #eventSource;
    /** @type {ProcessEventBatch} */
    #processEventBatch;
    /** @type {Flush | undefined} */
    #flush;

    /**
     * @param {object} dependencies
     * @param {object} dependencies.queries
     * @param {object} dependencies.provider
     * @param {{latestNonOpened: string, missing: string, latestOpened: string, scheduled: string}} dependencies.jobNames
     * @param {EmailAnalyticsEventSource} dependencies.eventSource
     * @param {ProcessEventBatch} dependencies.processEventBatch
     * @param {Flush} [dependencies.flush]
     */
    constructor({queries, provider, jobNames, eventSource, processEventBatch, flush}) {
        this.queries = queries;
        this.provider = provider;
        this.#jobNames = jobNames;
        this.#eventSource = eventSource;
        this.#processEventBatch = processEventBatch;
        this.#flush = flush;
        this.#fetchLatestNonOpenedData = {
            running: false,
            jobName: jobNames.latestNonOpened
        };
        this.#fetchMissingData = {
            running: false,
            jobName: jobNames.missing
        };
        this.#fetchLatestOpenedData = {
            running: false,
            jobName: jobNames.latestOpened
        };
        this.#fetchScheduledData = {
            running: false,
            jobName: jobNames.scheduled
        };
    }

    #clearScheduledData() {
        this.#fetchScheduledData = {
            running: false,
            jobName: this.#jobNames.scheduled
        };
        this.queries.setJobMetadata(this.#jobNames.scheduled, null);
    }

    getStatus() {
        return {
            latest: this.#fetchLatestNonOpenedData,
            missing: this.#fetchMissingData,
            scheduled: this.#fetchScheduledData,
            latestOpened: this.#fetchLatestOpenedData
        };
    }

    /**
     * Runs the pipeline's flush hook (if it has one), timing the call so the
     * fetch result can report aggregation cost. Returns zeroed timings when the
     * pipeline aggregates inline and provides no flush hook.
     * @param {{includeOpenedEvents: boolean, force: boolean}} options
     * @returns {Promise<{aggregationTimeMs: number, emailAggregationTimeMs: number, memberAggregationTimeMs: number}>}
     */
    async #performFlush({includeOpenedEvents, force}) {
        if (!this.#flush) {
            return {aggregationTimeMs: 0, emailAggregationTimeMs: 0, memberAggregationTimeMs: 0};
        }

        const start = Date.now();
        const {emailAggregationTimeMs = 0, memberAggregationTimeMs = 0} = await this.#flush({includeOpenedEvents, force}) ?? {};
        return {
            aggregationTimeMs: Date.now() - start,
            emailAggregationTimeMs,
            memberAggregationTimeMs
        };
    }

    /**
     * Returns the timestamp of the last non-opened event we processed. Defaults to now minus 30 minutes if we have no data yet.
     */
    async getLastNonOpenedEventTimestamp() {
        return this.#fetchLatestNonOpenedData?.lastEventTimestamp ?? (await this.queries.getLastEventTimestamp(this.#fetchLatestNonOpenedData.jobName, ['delivered', 'failed'], this.#eventSource)) ?? new Date(Date.now() - TRUST_THRESHOLD_MS);
    }

    /**
     * Returns the timestamp of the last opened event we processed. Defaults to now minus 30 minutes if we have no data yet.
     */
    async getLastOpenedEventTimestamp() {
        return this.#fetchLatestOpenedData?.lastEventTimestamp ?? (await this.queries.getLastEventTimestamp(this.#fetchLatestOpenedData.jobName, ['opened'], this.#eventSource)) ?? new Date(Date.now() - TRUST_THRESHOLD_MS);
    }

    /**
     * Returns the timestamp of the last missing event we processed. Defaults to now minus 2h if we have no data yet.
     */
    async getLastMissingEventTimestamp() {
        return this.#fetchMissingData?.lastEventTimestamp ?? (await this.queries.getLastJobRunTimestamp(this.#fetchMissingData.jobName)) ?? new Date(Date.now() - TRUST_THRESHOLD_MS * 4);
    }

    /**
     * Fetches the latest opened events.
     * @param {Object} options - The options for fetching events.
     * @param {number} [options.maxEvents=Infinity] - The maximum number of events to fetch.
     * @returns {Promise<EmailAnalyticsFetchResult>} Fetch results with timing metrics
     */
    async fetchLatestOpenedEvents({maxEvents = Infinity} = {}) {
        const begin = await this.getLastOpenedEventTimestamp();
        const end = new Date(Date.now() - FETCH_LATEST_END_MARGIN_MS); // Always stop at x minutes ago to give Mailgun a bit more time to stabilize storage

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Skipping fetchLatestOpenedEvents because end (' + end + ') is before begin (' + begin + ')');
            return createEmptyResult();
        }

        return await this.#fetchEvents(this.#fetchLatestOpenedData, {begin, end, maxEvents, eventTypes: ['opened']});
    }

    /**
     * Fetches the latest non-opened events.
     * @param {Object} options - The options for fetching events.
     * @param {number} [options.maxEvents=Infinity] - The maximum number of events to fetch.
     * @returns {Promise<EmailAnalyticsFetchResult>} Fetch results with timing metrics
     */
    async fetchLatestNonOpenedEvents({maxEvents = Infinity} = {}) {
        const begin = await this.getLastNonOpenedEventTimestamp();
        const end = new Date(Date.now() - FETCH_LATEST_END_MARGIN_MS); // Always stop at x minutes ago to give Mailgun a bit more time to stabilize storage

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Skipping fetchLatestNonOpenedEvents because end (' + end + ') is before begin (' + begin + ')');
            return createEmptyResult();
        }

        return await this.#fetchEvents(this.#fetchLatestNonOpenedData, {begin, end, maxEvents, eventTypes: ['delivered', 'failed', 'unsubscribed', 'complained']});
    }

    /**
     * Fetches events that are older than 30 minutes, because then the 'storage' of the Mailgun API is stable. And we are sure we don't miss any events.
     * @param {object} options
     * @param {number} [options.maxEvents] Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     * @returns {Promise<EmailAnalyticsFetchResult>} Fetch results with timing metrics
     */
    async fetchMissing({maxEvents = Infinity} = {}) {
        const begin = await this.getLastMissingEventTimestamp();

        // Always stop at the earlier of the time the fetchLatest started fetching on or 30 minutes ago
        const end = new Date(
            Math.min(
                Date.now() - TRUST_THRESHOLD_MS,
                this.#fetchLatestNonOpenedData?.lastBegin?.getTime() || Date.now() // Fallback to now if the previous job didn't run, for whatever reason, prevents catastrophic error
            )
        );

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Skipping fetchMissing because end (' + end + ') is before begin (' + begin + ')');
            return createEmptyResult();
        }

        return await this.#fetchEvents(this.#fetchMissingData, {begin, end, maxEvents});
    }

    /**
     * Schedule a new fetch for email analytics events.
     * @param {Object} options - The options for scheduling the fetch.
     * @param {Date} options.begin - The start date for the scheduled fetch.
     * @param {Date} options.end - The end date for the scheduled fetch.
     * @throws {errors.ValidationError} Throws an error if a fetch is already in progress.
     */
    async schedule({begin, end}) {
        if (this.#fetchScheduledData && this.#fetchScheduledData.running) {
            throw new errors.ValidationError({
                message: 'Already fetching scheduled events. Wait for it to finish before scheduling a new one.'
            });
        }
        logging.info('[EmailAnalytics] Scheduling fetch from ' + begin.toISOString() + ' until ' + end.toISOString());
        this.#fetchScheduledData = {
            running: false,
            jobName: this.#jobNames.scheduled,
            schedule: {
                begin,
                end
            }
        };
        await this.queries.setJobMetadata(this.#jobNames.scheduled, {
            begin: begin.toISOString(),
            end: end.toISOString()
        });
    }

    /**
     * Cancels the scheduled fetch of email analytics events.
     * If a fetch is currently running, it marks it for cancellation.
     * If no fetch is running, it clears the scheduled fetch data.
     * @method cancelScheduled
     */
    cancelScheduled() {
        if (this.#fetchScheduledData) {
            if (this.#fetchScheduledData.running) {
                this.#fetchScheduledData.canceled = true;
                // Clear metadata eagerly; fetchScheduled() will clear in-memory state next cycle
                this.queries.setJobMetadata(this.#jobNames.scheduled, null);
            } else {
                this.#clearScheduledData();
            }
        }
    }

    /**
     * Restores a previously persisted scheduled fetch from the database.
     * Must only be called once on startup (caller guards against repeated calls).
     */
    async restoreScheduled() {
        try {
            const jobData = await this.queries.getJobData(this.#jobNames.scheduled);
            if (!jobData || !jobData.metadata) {
                return;
            }

            const metadata = JSON.parse(jobData.metadata);
            if (metadata.begin && metadata.end) {
                const begin = new Date(metadata.begin);
                const end = new Date(metadata.end);

                this.#fetchScheduledData = {
                    running: false,
                    jobName: this.#jobNames.scheduled,
                    schedule: {begin, end}
                };

                // Use finished_at as the resume cursor if available
                if (jobData.finished_at) {
                    this.#fetchScheduledData.lastEventTimestamp = new Date(jobData.finished_at);
                }

                logging.info('[EmailAnalytics] Restored scheduled fetch: ' + begin.toISOString() + ' to ' + end.toISOString());
            }
        } catch (e) {
            logging.error('[EmailAnalytics] Failed to restore scheduled fetch', e);
        }
    }

    /**
     * Continues fetching the scheduled events (does not start one). Resets the scheduled event when received 0 events.
     * @method fetchScheduled
     * @param {Object} [options] - The options for fetching scheduled events.
     * @param {number} [options.maxEvents=Infinity] - The maximum number of events to fetch.
     * @returns {Promise<EmailAnalyticsFetchResult>} Fetch results with timing metrics
     */
    async fetchScheduled({maxEvents = Infinity} = {}) {
        if (!this.#fetchScheduledData || !this.#fetchScheduledData.schedule) {
            // Nothing scheduled
            return createEmptyResult();
        }

        if (this.#fetchScheduledData.canceled) {
            this.#clearScheduledData();
            return createEmptyResult();
        }

        let begin = this.#fetchScheduledData.schedule.begin;
        const end = this.#fetchScheduledData.schedule.end;

        if (this.#fetchScheduledData.lastEventTimestamp && this.#fetchScheduledData.lastEventTimestamp > begin) {
            // Continue where we left of
            begin = this.#fetchScheduledData.lastEventTimestamp;
        }

        if (end <= begin) {
            logging.info('[EmailAnalytics] Ending fetchScheduled because end is before begin');
            this.#clearScheduledData();
            return createEmptyResult();
        }

        const fetchResult = await this.#fetchEvents(this.#fetchScheduledData, {begin, end, maxEvents});
        if (fetchResult.eventCount === 0 || this.#fetchScheduledData.canceled) {
            this.#clearScheduledData();
        }

        this.queries.setJobTimestamp(this.#fetchScheduledData.jobName, 'finished', this.#fetchScheduledData.lastEventTimestamp);
        return fetchResult;
    }
    /**
     * Start fetching analytics and store the data of the progress inside fetchData
     * @param {FetchData} fetchData - Object to store the progress of the fetch operation
     * @param {object} options - Options for fetching events
     * @param {Date} options.begin - Start date for fetching events
     * @param {Date} options.end - End date for fetching events
     * @param {number} [options.maxEvents=Infinity] - Maximum number of events to fetch. Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     * @param {EmailAnalyticsEvent[]} [options.eventTypes] - Array of event types to fetch. If not provided, Mailgun will return all event types.
     * @returns {Promise<EmailAnalyticsFetchResult>} Fetch results with timing metrics
     */
    async #fetchEvents(fetchData, {begin, end, maxEvents = Infinity, eventTypes = null}) {
        // Start where we left of, or the last stored event in the database, or start 30 minutes ago if we have nothing available
        // Store that we started fetching
        fetchData.running = true;
        fetchData.lastStarted = new Date();
        fetchData.lastBegin = begin;
        this.queries.setJobTimestamp(fetchData.jobName, 'started', begin);

        // Timing metrics
        const fetchStartMs = Date.now();
        let processingTimeMs = 0;
        let aggregationTimeMs = 0;
        let emailAggregationTimeMs = 0;
        let memberAggregationTimeMs = 0;

        let eventCount = 0;
        const includeOpenedEvents = eventTypes?.includes('opened') ?? false;

        // We keep the processing result here, so we also have a result in case of failures.
        // The pipeline owns aggregation (via the flush hook), so we never reset this and can
        // accumulate every count and id into it directly.
        const processingResult = new EventProcessingResult();
        let error = null;

        /**
         * Process a batch of events
         * @param {Array<Object>} events - Array of event objects to process
         * @returns {Promise<void>}
         */
        const processBatch = async (events) => {
            // Even if the fetching is interrupted because of an error, we still store the last event timestamp
            const processingStart = Date.now();
            await this.#processEventBatch(events, processingResult, fetchData);
            processingTimeMs += (Date.now() - processingStart);
            eventCount += events.length;

            // Offer the pipeline a chance to flush aggregations mid-fetch so new stats become
            // visible without waiting for the whole fetch to finish. The pipeline decides
            // whether this checkpoint actually does any work.
            try {
                const timings = await this.#performFlush({includeOpenedEvents, force: false});
                aggregationTimeMs += timings.aggregationTimeMs;
                emailAggregationTimeMs += timings.emailAggregationTimeMs;
                memberAggregationTimeMs += timings.memberAggregationTimeMs;
            } catch (err) {
                logging.error('[EmailAnalytics] Error while aggregating stats');
                logging.error(err);
            }

            if (fetchData.canceled) {
                throw new errors.InternalServerError({
                    message: 'Fetching canceled'
                });
            }
        };

        try {
            await this.provider.fetchLatest(processBatch, {begin, end, maxEvents, events: eventTypes});
        } catch (err) {
            if (err.message !== 'Fetching canceled') {
                logging.error('[EmailAnalytics] Error while fetching');
                logging.error(err);
                error = err;
            } else {
                logging.error('[EmailAnalytics] Canceled fetching');
            }
        }

        // Final flush: aggregate anything the pipeline still has pending, even if we errored out.
        try {
            const timings = await this.#performFlush({includeOpenedEvents, force: true});
            aggregationTimeMs += timings.aggregationTimeMs;
            emailAggregationTimeMs += timings.emailAggregationTimeMs;
            memberAggregationTimeMs += timings.memberAggregationTimeMs;
        } catch (err) {
            logging.error('[EmailAnalytics] Error while aggregating stats');
            logging.error(err);

            if (!error) {
                error = err;
            }
        }

        // When we've consumed all available events (eventCount < maxEvents), advance the cursor by 1 second
        // to avoid re-fetching the same batch on the next cycle. When we hit the maxEvents budget mid-second,
        // do NOT advance — the next pass needs to re-cover that second to pick up any remaining events.
        if (!error && eventCount > 0 && fetchData.lastEventTimestamp && fetchData.lastEventTimestamp.getTime() < Date.now() - 2000) {
            // Persist cursor to DB so we can resume after reboot
            await this.queries.setJobTimestamp(fetchData.jobName, 'finished', new Date(fetchData.lastEventTimestamp.getTime()));
            if (eventCount < maxEvents) {
                // Consumed everything in the window — advance to avoid re-fetching same batch
                fetchData.lastEventTimestamp = new Date(fetchData.lastEventTimestamp.getTime() + 1000);
            }
        } else {
            await this.queries.setJobStatus(fetchData.jobName, 'finished');
        }

        fetchData.running = false;

        const totalTimeMs = Date.now() - fetchStartMs;
        // Derived by subtraction because fetchLatest() invokes processBatch internally,
        // so directly timing fetchLatest() would double-count processing and aggregation time.
        const apiPollingTimeMs = totalTimeMs - processingTimeMs - aggregationTimeMs;

        if (error) {
            throw error;
        }

        return {
            eventCount,
            apiPollingTimeMs,
            processingTimeMs,
            aggregationTimeMs,
            emailAggregationTimeMs,
            memberAggregationTimeMs,
            result: processingResult
        };
    }
};
