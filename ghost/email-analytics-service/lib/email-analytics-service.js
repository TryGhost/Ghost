const EventProcessingResult = require('./event-processing-result');
const logging = require('@tryghost/logging');

/**
 * @typedef {import('@tryghost/email-service').EmailEventProcessor} EmailEventProcessor
 */

/**
 * @typedef {object} FetchData
 * @property {boolean} running
 * @property {Date} [lastStarted] Date the last fetch started on
 * @property {Date} [lastBegin] The begin time used during the last fetch
 * @property {Date} [lastEventTimestamp]
 */

const TRUST_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

module.exports = class EmailAnalytics {
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

    /**
     * Returns the timestamp of the last event we processed. Defaults to now minus 30 minutes if we have no data yet.
     */
    async getLastEventTimestamp() {
        return this.#fetchLatestData?.lastEventTimestamp ?? (await this.queries.getLastSeenEventTimestamp()) ?? new Date(Date.now() - TRUST_THRESHOLD_MS);
    }

    async fetchLatest({maxEvents = Infinity} = {}) {
        // Start where we left of, or the last stored event in the database, or start 30 minutes ago if we have nothing available
        const begin = await this.getLastEventTimestamp();
        const end = new Date();

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
        // We start where we left of, or 30 minutes before the last event we received
        const begin = this.#fetchMissingData?.lastEventTimestamp ?? new Date((await this.getLastEventTimestamp()).getTime() - TRUST_THRESHOLD_MS);

        // Always stop at the time the fetchLatest started fetching on, or maximum 30 minutes ago
        const end = new Date(
            Math.min(
                Date.now() - TRUST_THRESHOLD_MS,
                this.#fetchLatestData?.lastBegin?.getTime()
            )
        );

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Skipping fetchMissing because end is before begin');
            return new EventProcessingResult();
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

        // We keep the processing result here, so we also have a result in case of failures
        const processingResult = new EventProcessingResult();

        const processBatch = async (events) => {
            // Even if the fetching is interrupted because of an error, we still store the last event timestamp
            return this.processEventBatch(events, processingResult, fetchData);
        };

        try {
            for (const provider of this.providers) {
                await provider.fetchLatest(processBatch, {begin, end, maxEvents});
            }

            logging.info('[EmailAnalytics] Fetching finshed');
        } catch (err) {
            logging.error('[EmailAnalytics] Error while fetching');
            logging.error(err);
        }

        fetchData.running = false;
        return processingResult;
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
            if (event.timestamp && event.timestamp > fetchData.lastEventTimestamp) {
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
     * @param {{id: string, type: any; severity: any; recipientEmail: any; emailId: any; providerId: string; timestamp: Date; error: {code: number; message: string; enhandedCode: string|number} | null}} event
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
        logging.info(`Aggregating email analytics for ${emailIds.length} emails`);
        for (const emailId of emailIds) {
            await this.aggregateEmailStats(emailId);
        }

        logging.info(`Aggregating email analytics for ${memberIds.length} members`);
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
