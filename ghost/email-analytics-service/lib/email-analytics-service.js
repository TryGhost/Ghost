const EventProcessingResult = require('./event-processing-result');
const debug = require('ghost-ignition').debug('services:email-analytics');

module.exports = class EmailAnalyticsService {
    constructor({config, settings, queries, eventProcessor, providers, logging} = {}) {
        this.config = config;
        this.settings = settings;
        this.queries = queries;
        this.eventProcessor = eventProcessor;
        this.providers = providers;
        this.logging = logging || console;
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
            const batchResult = await this.eventProcessor.process(event);
            result.merge(batchResult);
        }

        return result;
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
