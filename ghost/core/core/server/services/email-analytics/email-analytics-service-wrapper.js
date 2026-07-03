const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const config = require('../../../shared/config');
const EmailAnalyticsRunner = require('./runner/email-analytics-runner');

class EmailAnalyticsServiceWrapper {
    init() {
        if (this.service) {
            return;
        }

        const EmailAnalyticsService = require('./email-analytics-service');
        const EmailEventStorage = require('../email-service/email-event-storage');
        const EmailEventProcessor = require('../email-service/email-event-processor');
        const MailgunProvider = require('./email-analytics-provider-mailgun');
        const {EmailRecipientFailure, EmailSpamComplaintEvent, Email} = require('../../models');
        const StartEmailAnalyticsJobEvent = require('./events/start-email-analytics-job-event');
        const domainEvents = require('@tryghost/domain-events');
        const settings = require('../../../shared/settings-cache');
        const labs = require('../../../shared/labs');
        const db = require('../../data/db');
        const queries = require('./lib/queries');
        const membersService = require('../members');
        const membersRepository = membersService.api.members;
        const emailSuppressionList = require('../email-suppression-list');
        const prometheusClient = require('../../../shared/prometheus-client');

        this.eventStorage = new EmailEventStorage({
            db,
            membersRepository,
            models: {
                Email,
                EmailRecipientFailure,
                EmailSpamComplaintEvent
            },
            emailSuppressionList,
            prometheusClient
        });

        // Since this is running in a worker thread, we cant dispatch directly
        // So we post the events as a message to the job manager
        const eventProcessor = new EmailEventProcessor({
            domainEvents,
            db,
            eventStorage: this.eventStorage,
            prometheusClient
        });

        this.service = new EmailAnalyticsService({
            config,
            settings,
            eventProcessor,
            providers: [
                new MailgunProvider({config, settings, labs})
            ],
            queries,
            domainEvents,
            prometheusClient
        });

        // Log the processing mode on initialization
        const batchProcessingEnabled = config.get('emailAnalytics:batchProcessing');
        logging.info(`[EmailAnalytics] Initialized with ${batchProcessingEnabled ? 'BATCHED' : 'SEQUENTIAL'} processing mode`);

        // We currently cannot trigger a non-offloaded job from the job manager
        // So the email analytics jobs simply emits an event.
        domainEvents.subscribe(StartEmailAnalyticsJobEvent, async () => {
            await this.startFetch();
        });
    }

    _getRunner() {
        if (!this.runner) {
            this.runner = new EmailAnalyticsRunner({
                adapter: {
                    name: 'newsletter',
                    restoreScheduled: async () => {
                        await this.service.restoreScheduled();
                    },
                    getLastOpenedEventTimestamp: async () => {
                        return await this.service.getLastOpenedEventTimestamp();
                    },
                    fetchLatestOpenedEvents: async (options) => {
                        return await this.fetchLatestOpenedEvents(options);
                    },
                    fetchLatestNonOpenedEvents: async (options) => {
                        return await this.fetchLatestNonOpenedEvents(options);
                    },
                    fetchMissing: async (options) => {
                        return await this.fetchMissing(options);
                    },
                    fetchScheduled: async (options) => {
                        return await this.fetchScheduled(options);
                    },
                    restartFetch: (reason) => {
                        this._restartFetch(reason);
                    }
                },
                logging
            });
        }

        return this.runner;
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
            `[EmailAnalytics] Job complete: ${jobType}`,
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
                metrics.metric('email-analytics-open-throughput', {
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
            logging.warn(`[EmailAnalytics] Opened events processing is ${lagMinutes.toFixed(1)} minutes behind (threshold: ${lagThreshold})`);
        }

        const fetchStartDate = new Date();
        const fetchResult = await this.service.fetchLatestOpenedEvents({maxEvents});
        const totalDuration = Date.now() - fetchStartDate.getTime();

        this._logJobCompletion('latest-opened', fetchResult, totalDuration);

        return fetchResult.eventCount;
    }

    async fetchLatestNonOpenedEvents({maxEvents} = {maxEvents: Infinity}) {
        const fetchStartDate = new Date();
        const fetchResult = await this.service.fetchLatestNonOpenedEvents({maxEvents});
        const totalDuration = Date.now() - fetchStartDate.getTime();

        this._logJobCompletion('latest', fetchResult, totalDuration);

        return fetchResult.eventCount;
    }

    async fetchMissing({maxEvents} = {maxEvents: Infinity}) {
        const fetchStartDate = new Date();
        const fetchResult = await this.service.fetchMissing({maxEvents});
        const totalDuration = Date.now() - fetchStartDate.getTime();

        this._logJobCompletion('missing', fetchResult, totalDuration);

        return fetchResult.eventCount;
    }

    async fetchScheduled({maxEvents}) {
        if (maxEvents < 300) {
            return 0;
        }

        const fetchStartDate = new Date();
        const fetchResult = await this.service.fetchScheduled({maxEvents});
        const totalDuration = Date.now() - fetchStartDate.getTime();

        this._logJobCompletion('scheduled', fetchResult, totalDuration);

        return fetchResult.eventCount;
    }

    async startFetch() {
        await this._getRunner().start();
    }

    _restartFetch(reason) {
        this.fetching = false;
        logging.info(`[EmailAnalytics] Restarting fetch due to ${reason}`);
        this.startFetch();
    }
}

module.exports = EmailAnalyticsServiceWrapper;
