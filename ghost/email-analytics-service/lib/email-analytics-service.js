const EventProcessingResult = require('./event-processing-result');
const debug = require('@tryghost/debug')('services:email-analytics');

/**
 * @typedef {import('@tryghost/email-service').EmailEventProcessor} EmailEventProcessor
 */

module.exports = class EmailAnalyticsService {
    config;
    settings;
    queries;
    eventProcessor;
    providers;

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

    async fetchAll() {
        const result = new EventProcessingResult();

        const shouldFetchStats = await this.queries.shouldFetchStats();
        if (!shouldFetchStats) {
            debug('fetchAll: skipping - fetch requirements not met');
            return result;
        }

        const startFetch = new Date();
        debug('fetchAll: starting');
        for (const [, provider] of Object.entries(this.providers)) {
            const providerResults = await provider.fetchAll(this.processEventBatch.bind(this));
            result.merge(providerResults);
        }
        debug(`fetchAll: finished (${Date.now() - startFetch}ms)`);

        return result;
    }

    async fetchLatest({maxEvents = Infinity} = {}) {
        const result = new EventProcessingResult();

        const shouldFetchStats = await this.queries.shouldFetchStats();
        if (!shouldFetchStats) {
            debug('fetchLatest: skipping - fetch requirements not met');
            return result;
        }

        const lastTimestamp = await this.queries.getLastSeenEventTimestamp();

        const startFetch = new Date();
        debug('fetchLatest: starting');
        providersLoop:
        for (const [, provider] of Object.entries(this.providers)) {
            const providerResults = await provider.fetchLatest(lastTimestamp, this.processEventBatch.bind(this), {maxEvents});
            result.merge(providerResults);

            if (result.totalEvents >= maxEvents) {
                break providersLoop;
            }
        }
        debug(`fetchLatest: finished in ${Date.now() - startFetch}ms. Fetched ${result.totalEvents} events`);

        return result;
    }

    async processEventBatch(events) {
        const result = new EventProcessingResult();

        for (const event of events) {
            const batchResult = await this.processEvent(event);
            result.merge(batchResult);
        }

        return result;
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
        for (const emailId of emailIds) {
            await this.aggregateEmailStats(emailId);
        }
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
