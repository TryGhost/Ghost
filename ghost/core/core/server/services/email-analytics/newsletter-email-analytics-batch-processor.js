const {EventProcessingResult} = require('./event-processing-result');
const logging = require('@tryghost/logging');
/** @import {BatchEventProcessor} from './batch-event-processor' */
/** @import {FetchData} from './email-analytics-service' */

/**
 * @implements {BatchEventProcessor}
 */
class NewsletterEmailAnalyticsBatchProcessor {
    #config;
    #emailEventProcessor;
    #prometheusClient;
    #queries;

    #lastAggregation = Date.now();

    constructor({
        config,
        emailEventProcessor,
        prometheusClient,
        queries
    }) {
        this.#config = config;
        this.#emailEventProcessor = emailEventProcessor;
        this.#prometheusClient = prometheusClient;
        this.#queries = queries;
    }

    /**
     * Process a batch of email analytics events.
     * @param {object[]} events - An array of email analytics events to process.
     * @param {EventProcessingResult} result - The result object to merge batch processing results into.
     * @param {FetchData} fetchData - Data related to the current fetch operation.
     * @returns {Promise<void>}
     */
    async processBatch(events, result, fetchData) {
        const useBatchProcessing = this.#config.get('emailAnalytics:batchProcessing');

        if (useBatchProcessing) {
            // Batched mode: pre-fetch all recipients, then process events using cache
            const emailIdentifications = events.map(event => ({
                emailId: event.emailId,
                providerId: event.providerId,
                email: event.recipientEmail
            }));

            const recipientCache = await this.#emailEventProcessor.batchGetRecipients(emailIdentifications);

            for (const event of events) {
                const batchResult = await this.#processEvent(event, recipientCache);

                // Save last event timestamp
                if (!fetchData.lastEventTimestamp || (event.timestamp && event.timestamp > fetchData.lastEventTimestamp)) {
                    fetchData.lastEventTimestamp = event.timestamp;
                }

                result.merge(batchResult);
            }

            // Flush all batched updates to the database
            await this.#emailEventProcessor.flushBatchedUpdates();
        } else {
            // Sequential mode: process events one by one (original behavior)
            for (const event of events) {
                const batchResult = await this.#processEvent(event);

                // Save last event timestamp
                if (!fetchData.lastEventTimestamp || (event.timestamp && event.timestamp > fetchData.lastEventTimestamp)) {
                    fetchData.lastEventTimestamp = event.timestamp;
                }

                result.merge(batchResult);
            }
        }
    }

    /**
     * @param {object} options
     * @param {boolean} options.includeOpenedEvents
     * @param {EventProcessingResult} options.processingResult
     * @param {boolean} options.isFinal
     * @returns {Promise<null | {
     *     emailAggregationTimeMs: number;
     *     memberAggregationTimeMs: number;
     * }>}
     */
    async aggregate({
        includeOpenedEvents,
        processingResult,
        isFinal
    }) {
        /** @type {boolean} */ let shouldAggregate;
        if (isFinal) {
            shouldAggregate = Boolean(
                processingResult.emailIds.length ||
                processingResult.memberIds.length
            );
        } else {
            // Every 5 minutes or 5000 members we do an aggregation and clear the processingResult
            // Otherwise we need to loop a lot of members afterwards, and this takes too long without updating the stat counts in between
            shouldAggregate = (
                (Date.now() - this.#lastAggregation) > 5 * 60 * 1000 ||
                processingResult.memberIds.length > 5000
            );
        }
        if (!shouldAggregate) {
            return null;
        }

        const result = await this.#aggregateStats(processingResult, includeOpenedEvents);

        processingResult.reset();
        this.#lastAggregation = Date.now();

        return result;
    }

    /**
     * @param {{id: string, type: any; severity: any; recipientEmail: any; emailId?: string; providerId: string; timestamp: Date; error: {code: number; message: string; enhandedCode: string|number} | null}} event
     * @param {Map<string, any>} [recipientCache] Optional cache for batched processing
     * @returns {Promise<EventProcessingResult>}
     */
    async #processEvent(event, recipientCache) {
        if (event.type === 'delivered') {
            const recipient = await this.#emailEventProcessor.handleDelivered({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp, recipientCache);

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
            const recipient = await this.#emailEventProcessor.handleOpened({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp, recipientCache);

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
                const recipient = await this.#emailEventProcessor.handlePermanentFailed({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, {id: event.id, timestamp: event.timestamp, error: event.error}, recipientCache);

                if (recipient) {
                    return new EventProcessingResult({
                        permanentFailed: 1,
                        emailIds: [recipient.emailId],
                        memberIds: [recipient.memberId]
                    });
                }

                return new EventProcessingResult({unprocessable: 1});
            } else {
                const recipient = await this.#emailEventProcessor.handleTemporaryFailed({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, {id: event.id, timestamp: event.timestamp, error: event.error}, recipientCache);

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
            const recipient = await this.#emailEventProcessor.handleUnsubscribed({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp, recipientCache);

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
            const recipient = await this.#emailEventProcessor.handleComplained({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp, recipientCache);

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

    /**
     * @param {{emailIds?: string[], memberIds?: string[]}} stats
     * @param {boolean} includeOpenedEvents
     * @returns {Promise<{emailAggregationTimeMs: number, memberAggregationTimeMs: number}>}
     */
    async #aggregateStats({emailIds = [], memberIds = []}, includeOpenedEvents = true) {
        const useBatchProcessing = this.#config.get('emailAnalytics:batchProcessing');

        const emailAggregationStart = Date.now();
        for (const emailId of emailIds) {
            await this.#aggregateEmailStats(emailId, includeOpenedEvents);
        }
        const emailAggregationTimeMs = Date.now() - emailAggregationStart;

        const memberMetric = this.#prometheusClient?.getMetric('email_analytics_aggregate_member_stats_count');

        const memberAggregationStart = Date.now();
        if (useBatchProcessing) {
            // Batched mode: process 100 members at a time
            logging.info(`[EmailAnalytics] Aggregating stats for ${memberIds.length} members using BATCHED mode (batch size: 100)`);
            const BATCH_SIZE = 100;
            for (let i = 0; i < memberIds.length; i += BATCH_SIZE) {
                const batch = memberIds.slice(i, i + BATCH_SIZE);
                await this.#aggregateMemberStatsBatch(batch);
                memberMetric?.inc(batch.length);
            }
        } else {
            // Sequential mode: process one member at a time
            logging.info(`[EmailAnalytics] Aggregating stats for ${memberIds.length} members using SEQUENTIAL mode`);
            for (const memberId of memberIds) {
                await this.#aggregateMemberStats(memberId);
                memberMetric?.inc();
            }
        }
        const memberAggregationTimeMs = Date.now() - memberAggregationStart;

        return {emailAggregationTimeMs, memberAggregationTimeMs};
    }

    /**
     * Aggregate email stats for a given email ID.
     * @param {string} emailId - The ID of the email to aggregate stats for.
     * @param {boolean} includeOpenedEvents - Whether to include opened events in the stats.
     * @returns {Promise<void>}
     */
    async #aggregateEmailStats(emailId, includeOpenedEvents) {
        return this.#queries.aggregateEmailStats(emailId, includeOpenedEvents);
    }

    /**
     * Aggregate member stats for a given member ID.
     * @param {string} memberId - The ID of the member to aggregate stats for.
     * @returns {Promise<void>}
     */
    async #aggregateMemberStats(memberId) {
        return this.#queries.aggregateMemberStats(memberId);
    }

    /**
     * Aggregate member stats for multiple members in a batch.
     * @param {string[]} memberIds - Array of member IDs to aggregate stats for.
     * @returns {Promise<void>}
     */
    async #aggregateMemberStatsBatch(memberIds) {
        return this.#queries.aggregateMemberStatsBatch(memberIds);
    }
}

exports.NewsletterEmailAnalyticsBatchProcessor = NewsletterEmailAnalyticsBatchProcessor;
