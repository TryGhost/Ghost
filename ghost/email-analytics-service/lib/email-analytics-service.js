const _ = require('lodash');
const EventProcessingResult = require('./lib/event-processing-result');
const EventProcessor = require('./lib/event-processor');
const StatsAggregator = require('./lib/stats-aggregator');
const defaultProviders = require('./providers');
const debug = require('ghost-ignition').debug('services:email-analytics');

// when fetching a batch we should keep a record of which emails have associated
// events so we only aggregate those that are affected

class EmailAnalyticsService {
    constructor({config, settings, logging, db, providers, eventProcessor, statsAggregator}) {
        this.config = config;
        this.settings = settings;
        this.logging = logging || console;
        this.db = db;
        this.providers = providers || defaultProviders.init({config, settings, logging});
        this.eventProcessor = eventProcessor || new EventProcessor({db, logging});
        this.statsAggregator = statsAggregator || new StatsAggregator({db, logging});
    }

    async fetchAll() {
        const result = new EventProcessingResult();

        const [emailCount] = await this.db.knex('emails').count('id as count');
        if (emailCount && emailCount.count <= 0) {
            debug('fetchAll: skipping - no emails to track');
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
        const lastTimestamp = await this.getLastSeenEventTimestamp();

        const [emailCount] = await this.db.knex('emails').count('id as count');
        if (emailCount && emailCount.count <= 0) {
            debug('fetchLatest: skipping - no emails to track');
            return result;
        }

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

    aggregateEmailStats(emailId) {
        return this.statsAggregator.aggregateEmail(emailId);
    }

    aggregateMemberStats(memberId) {
        return this.statsAggregator.aggregateMember(memberId);
    }

    async getLastSeenEventTimestamp() {
        const startDate = new Date();
        // three separate queries is much faster than using max/greatest across columns with coalesce to handle nulls
        const {maxDeliveredAt} = await this.db.knex('email_recipients').select(this.db.knex.raw('MAX(delivered_at) as maxDeliveredAt')).first() || {};
        const {maxOpenedAt} = await this.db.knex('email_recipients').select(this.db.knex.raw('MAX(opened_at) as maxOpenedAt')).first() || {};
        const {maxFailedAt} = await this.db.knex('email_recipients').select(this.db.knex.raw('MAX(failed_at) as maxFailedAt')).first() || {};
        const lastSeenEventTimestamp = _.max([maxDeliveredAt, maxOpenedAt, maxFailedAt]);
        debug(`getLastSeenEventTimestamp: finished in ${Date.now() - startDate}ms`);

        return lastSeenEventTimestamp;
    }
}

module.exports = EmailAnalyticsService;
