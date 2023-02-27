const EventProcessingResult = require('./event-processing-result');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * @typedef {import('@tryghost/email-service').EmailEventProcessor} EmailEventProcessor
 */

/**
 * @typedef {object} FetchData
 * @property {boolean} running
 * @property {Date} [lastStarted] Date the last fetch started on
 * @property {Date} [lastBegin] The begin time used during the last fetch
 * @property {Date} [lastEventTimestamp]
 * @property {boolean} [canceled] Set to quit the job early
 */

/**
 * @typedef {FetchData & {schedule: {begin: Date, end: Date}}} FetchDataScheduled
 */

const TRUST_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_LATEST_END_MARGIN_MS = 1 * 60 * 1000; // Do not fetch events newer than 1 minute (yet). Reduces the chance of having missed events in fetchLatest.

module.exports = class EmailAnalyticsService {
    config;
    settings;
    queries;
    eventProcessor;
    providers;

    /**
     * @type {FetchData}
     */
    #fetchLatestData = null;

    /**
     * @type {FetchData}
     */
    #fetchMissingData = null;

    /**
     * @type {FetchDataScheduled}
     */
    #fetchScheduledData = null;

    /**
     * @param {object} dependencies
     * @param {EmailEventProcessor} dependencies.eventProcessor
     */
    constructor({config, settings, queries, eventProcessor, providers}) {
        this.config = config;
        this.settings = settings;
        this.queries = queries;
        this.eventProcessor = eventProcessor;
        this.providers = providers;
    }

    getStatus() {
        return {
            latest: this.#fetchLatestData,
            missing: this.#fetchMissingData,
            scheduled: this.#fetchScheduledData
        };
    }

    /**
     * Returns the timestamp of the last event we processed. Defaults to now minus 30 minutes if we have no data yet.
     */
    async getLastEventTimestamp() {
        return this.#fetchLatestData?.lastEventTimestamp ?? (await this.queries.getLastSeenEventTimestamp()) ?? new Date(Date.now() - TRUST_THRESHOLD_MS);
    }

    async fetchLatest({maxEvents = Infinity} = {}) {
        // Start where we left of, or the last stored event in the database, or start 30 minutes ago if we have nothing available
        const begin = await this.getLastEventTimestamp();
        const end = new Date(Date.now() - FETCH_LATEST_END_MARGIN_MS); // ALways stop at x minutes ago to give Mailgun a bit more time to stabilize storage

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Skipping fetchLatest because end (' + end + ') is before begin (' + begin + ')');
            return 0;
        }

        // Create the fetch data object if it doesn't exist yet
        if (!this.#fetchLatestData) {
            this.#fetchLatestData = {
                running: false
            };
        }

        return await this.#fetchEvents(this.#fetchLatestData, {begin, end, maxEvents});
    }

    /**
     * Fetches events that are older than 30 minutes, because then the 'storage' of the Mailgun API is stable. And we are sure we don't miss any events.
     * @param {object} options
     * @param {number} [options.maxEvents] Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     */
    async fetchMissing({maxEvents = Infinity} = {}) {
        // We start where we left of, or 1,5h ago after a server restart
        const begin = this.#fetchMissingData?.lastEventTimestamp ?? this.#fetchMissingData?.lastBegin ?? new Date(Date.now() - TRUST_THRESHOLD_MS * 3);

        // Always stop at the time the fetchLatest started fetching on, or maximum 30 minutes ago
        const end = new Date(
            Math.min(
                Date.now() - TRUST_THRESHOLD_MS,
                this.#fetchLatestData?.lastBegin?.getTime()
            )
        );

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Skipping fetchMissing because end (' + end + ') is before begin (' + begin + ')');
            return 0;
        }

        // Create the fetch data object if it doesn't exist yet
        if (!this.#fetchMissingData) {
            this.#fetchMissingData = {
                running: false
            };
        }

        return await this.#fetchEvents(this.#fetchMissingData, {begin, end, maxEvents});
    }

    /**
     * Schedule a new fetch that should happen
     */
    schedule({begin, end}) {
        if (this.#fetchScheduledData && this.#fetchScheduledData.running) {
            throw new errors.ValidationError({
                message: 'Already fetching scheduled events. Wait for it to finish before scheduling a new one.'
            });
        }
        logging.info('[EmailAnalytics] Scheduling fetch from ' + begin.toISOString() + ' until ' + end.toISOString());
        this.#fetchScheduledData = {
            running: false,
            schedule: {
                begin,
                end
            }
        };
    }

    cancelScheduled() {
        if (this.#fetchScheduledData) {
            if (this.#fetchScheduledData.running) {
                // Cancel the running fetch
                this.#fetchScheduledData.canceled = true;
            } else {
                this.#fetchScheduledData = null;
            }
        }
    }

    /**
     * Continues fetching the scheduled events (does not start one). Resets the scheduled event when received 0 events.
     */
    async fetchScheduled({maxEvents = Infinity} = {}) {
        if (!this.#fetchScheduledData || !this.#fetchScheduledData.schedule) {
            // Nothing scheduled
            return 0;
        }

        if (this.#fetchScheduledData.canceled) {
            // Skip for now
            this.#fetchScheduledData = null;
            return 0;
        }

        let begin = this.#fetchScheduledData.schedule.begin;
        const end = this.#fetchScheduledData.schedule.end;

        if (this.#fetchScheduledData.lastEventTimestamp && this.#fetchScheduledData.lastEventTimestamp > begin) {
            // Continue where we left of
            begin = this.#fetchScheduledData.lastEventTimestamp;
        }

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Ending fetchScheduled because end is before begin');
            this.#fetchScheduledData = null;
            return 0;
        }

        const count = await this.#fetchEvents(this.#fetchScheduledData, {begin, end, maxEvents});
        if (count === 0 || this.#fetchScheduledData.canceled) {
            // Reset the scheduled fetch
            this.#fetchScheduledData = null;
        }
        return count;
    }

    /**
     * Start fetching analytics and store the data of the progress inside fetchData
     * @param {FetchData} fetchData
     * @param {object} options
     * @param {Date} options.begin
     * @param {Date} options.end
     * @param {number} [options.maxEvents] Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     */
    async #fetchEvents(fetchData, {begin, end, maxEvents = Infinity}) {
        // Start where we left of, or the last stored event in the database, or start 30 minutes ago if we have nothing available
        logging.info('[EmailAnalytics] Fetching from ' + begin.toISOString() + ' until ' + end.toISOString() + ' (maxEvents: ' + maxEvents + ')');

        // Store that we started fetching
        fetchData.running = true;
        fetchData.lastStarted = new Date();
        fetchData.lastBegin = begin;

        let lastAggregation = Date.now();
        let eventCount = 0;

        // We keep the processing result here, so we also have a result in case of failures
        let processingResult = new EventProcessingResult();
        let error = null;

        const processBatch = async (events) => {
            // Even if the fetching is interrupted because of an error, we still store the last event timestamp
            await this.processEventBatch(events, processingResult, fetchData);
            eventCount += events.length;

            // Every 5 minutes or 5000 members we do an aggregation and clear the processingResult
            // Otherwise we need to loop a lot of members afterwards, and this takes too long without updating the stat counts in between
            if (Date.now() - lastAggregation > 5 * 60 * 1000 || processingResult.memberIds.length > 5000) {
                // Aggregate and clear the processingResult
                // We do this here because otherwise it could take a long time before the new events are visible in the stats
                try {
                    await this.aggregateStats(processingResult);
                    lastAggregation = Date.now();
                    processingResult = new EventProcessingResult();
                } catch (err) {
                    logging.error('[EmailAnalytics] Error while aggregating stats');
                    logging.error(err);
                }
            }

            if (fetchData.canceled) {
                throw new errors.InternalServerError({
                    message: 'Fetching canceled'
                });
            }
        };

        try {
            for (const provider of this.providers) {
                await provider.fetchLatest(processBatch, {begin, end, maxEvents});
            }

            logging.info('[EmailAnalytics] Fetching finished');
        } catch (err) {
            if (err.message !== 'Fetching canceled') {
                logging.error('[EmailAnalytics] Error while fetching');
                logging.error(err);
                error = err;
            } else {
                logging.error('[EmailAnalytics] Canceled fetching');
            }
        }

        // Aggregate
        try {
            await this.aggregateStats(processingResult);
        } catch (err) {
            logging.error('[EmailAnalytics] Error while aggregating stats');
            logging.error(err);

            if (!error) {
                error = err;
            }
        }

        // Small trick: if reached the end of new events, we are going to keep
        // fetching the same events because 'begin' won't change
        // So if we didn't have errors while fetching, and total events < maxEvents, increase lastEventTimestamp with one second
        if (!error && eventCount > 0 && eventCount < maxEvents && fetchData.lastEventTimestamp && fetchData.lastEventTimestamp.getTime() < Date.now() - 2000) {
            logging.info('[EmailAnalytics] Reached end of new events, increasing lastEventTimestamp with one second');
            fetchData.lastEventTimestamp = new Date(fetchData.lastEventTimestamp.getTime() + 1000);
        }

        fetchData.running = false;

        if (error) {
            throw error;
        }
        return eventCount;
    }

    /**
     * @param {any[]} events
     * @param {FetchData} fetchData
     */
    async processEventBatch(events, result, fetchData) {
        const processStart = Date.now();
        for (const event of events) {
            const batchResult = await this.processEvent(event);

            // Save last event timestamp
            if (!fetchData.lastEventTimestamp || (event.timestamp && event.timestamp > fetchData.lastEventTimestamp)) {
                fetchData.lastEventTimestamp = event.timestamp;
            }

            result.merge(batchResult);
        }
        const processEnd = Date.now();
        const time = processEnd - processStart;
        if (time > 1000) {
            // This is a means to show in the logs that the analytics job is still alive.
            logging.warn(`[EmailAnalytics] Processing event batch took ${(time / 1000).toFixed(1)}s`);
        }
    }

    /**
     *
     * @param {{id: string, type: any; severity: any; recipientEmail: any; emailId?: string; providerId: string; timestamp: Date; error: {code: number; message: string; enhandedCode: string|number} | null}} event
     * @returns {Promise<EventProcessingResult>}
     */
    async processEvent(event) {
        if (event.type === 'delivered') {
            const recipient = await this.eventProcessor.handleDelivered({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp);

            if (recipient) {
                return new EventProcessingResult({
                    delivered: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'opened') {
            const recipient = await this.eventProcessor.handleOpened({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp);

            if (recipient) {
                return new EventProcessingResult({
                    opened: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'failed') {
            if (event.severity === 'permanent') {
                const recipient = await this.eventProcessor.handlePermanentFailed({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, {id: event.id, timestamp: event.timestamp, error: event.error});

                if (recipient) {
                    return new EventProcessingResult({
                        permanentFailed: 1,
                        emailIds: [recipient.emailId],
                        memberIds: [recipient.memberId]
                    });
                }

                return new EventProcessingResult({unprocessable: 1});
            } else {
                const recipient = await this.eventProcessor.handleTemporaryFailed({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, {id: event.id, timestamp: event.timestamp, error: event.error});

                if (recipient) {
                    return new EventProcessingResult({
                        temporaryFailed: 1,
                        emailIds: [recipient.emailId],
                        memberIds: [recipient.memberId]
                    });
                }

                return new EventProcessingResult({unprocessable: 1});
            }
        }

        if (event.type === 'unsubscribed') {
            const recipient = await this.eventProcessor.handleUnsubscribed({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp);

            if (recipient) {
                return new EventProcessingResult({
                    unsubscribed: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'complained') {
            const recipient = await this.eventProcessor.handleComplained({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp);

            if (recipient) {
                return new EventProcessingResult({
                    complained: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        return new EventProcessingResult({unhandled: 1});
    }

    async aggregateStats({emailIds = [], memberIds = []}) {
        logging.info(`[EmailAnalytics] Aggregating for ${emailIds.length} emails`);
        for (const emailId of emailIds) {
            await this.aggregateEmailStats(emailId);
        }

        logging.info(`[EmailAnalytics] Aggregating for ${memberIds.length} members`);
        for (const memberId of memberIds) {
            await this.aggregateMemberStats(memberId);
        }
    }

    async aggregateEmailStats(emailId) {
        return this.queries.aggregateEmailStats(emailId);
    }

    async aggregateMemberStats(memberId) {
        return this.queries.aggregateMemberStats(memberId);
    }
};
