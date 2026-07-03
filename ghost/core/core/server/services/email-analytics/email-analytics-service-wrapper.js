const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const config = require('../../../shared/config');
const EmailAnalyticsRunner = require('./runner/email-analytics-runner');

class EmailAnalyticsServiceWrapper {
    init() {
        if (this.service && this.automationPipeline) {
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

        if (!this.service) {
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

        if (!this.automationPipeline && labs.isSet('automations')) {
            const StartAutomationEmailAnalyticsJobEvent = require('./events/start-automation-email-analytics-job-event');
            const AutomationAnalyticsPipeline = require('./automation/automation-analytics-pipeline');

            this.automationPipeline = new AutomationAnalyticsPipeline({
                config,
                settings,
                labs,
                queries,
                db
            });

            domainEvents.subscribe(StartAutomationEmailAnalyticsJobEvent, async () => {
                await this.startAutomationFetch();
            });
        }
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
                        return await this._fetchLatestOpenedEventsResult(options);
                    },
                    fetchLatestNonOpenedEvents: async (options) => {
                        return await this._fetchLatestNonOpenedEventsResult(options);
                    },
                    fetchMissing: async (options) => {
                        return await this._fetchMissingResult(options);
                    },
                    fetchScheduled: async (options) => {
                        return await this._fetchScheduledResult(options);
                    },
                    restartFetch: (reason) => {
                        this._restartFetch(reason);
                    }
                },
                logging,
                metrics,
                config
            });
        }

        return this.runner;
    }

    _getAutomationRunner() {
        if (!this.automationRunner) {
            this.automationRunner = new EmailAnalyticsRunner({
                adapter: {
                    name: 'automation',
                    getLastOpenedEventTimestamp: async () => {
                        return await this.automationPipeline.getLastOpenedEventTimestamp();
                    },
                    fetchLatestOpenedEvents: async (options) => {
                        return await this.automationPipeline.fetchLatestOpenedEvents(options);
                    },
                    fetchLatestNonOpenedEvents: async (options) => {
                        return await this.automationPipeline.fetchLatestNonOpenedEvents(options);
                    },
                    fetchMissing: async (options) => {
                        return await this.automationPipeline.fetchMissing(options);
                    },
                    restartFetch: (reason) => {
                        this._restartAutomationFetch(reason);
                    }
                },
                logging,
                metrics,
                config
            });
        }

        return this.automationRunner;
    }

    _getEventCount(fetchResult) {
        if (typeof fetchResult === 'number') {
            return fetchResult;
        }

        return fetchResult?.eventCount || 0;
    }

    async _fetchLatestOpenedEventsResult({maxEvents} = {maxEvents: Infinity}) {
        const beginTimestamp = await this.service.getLastOpenedEventTimestamp();
        const lagMinutes = (Date.now() - beginTimestamp.getTime()) / 60000;
        const lagThreshold = config.get('emailAnalytics:openedJobLagWarningMinutes');

        // NOTE: We only update the begin timestamp when we process events, so there's cases where we can have a false positive
        //  - Ghost or Mailgun outages
        //  - Lack of actual email activity
        if (lagThreshold && lagMinutes > lagThreshold) {
            logging.warn(`[EmailAnalytics] Opened events processing is ${lagMinutes.toFixed(1)} minutes behind (threshold: ${lagThreshold})`);
        }

        const fetchResult = await this.service.fetchLatestOpenedEvents({maxEvents});

        return fetchResult;
    }

    async fetchLatestOpenedEvents({maxEvents} = {maxEvents: Infinity}) {
        const fetchResult = await this._getRunner().fetchAndLogCompletion('latest-opened', async () => {
            return await this._fetchLatestOpenedEventsResult({maxEvents});
        });

        return this._getEventCount(fetchResult);
    }

    async _fetchLatestNonOpenedEventsResult({maxEvents} = {maxEvents: Infinity}) {
        return await this.service.fetchLatestNonOpenedEvents({maxEvents});
    }

    async fetchLatestNonOpenedEvents({maxEvents} = {maxEvents: Infinity}) {
        const fetchResult = await this._getRunner().fetchAndLogCompletion('latest', async () => {
            return await this._fetchLatestNonOpenedEventsResult({maxEvents});
        });

        return this._getEventCount(fetchResult);
    }

    async _fetchMissingResult({maxEvents} = {maxEvents: Infinity}) {
        return await this.service.fetchMissing({maxEvents});
    }

    async fetchMissing({maxEvents} = {maxEvents: Infinity}) {
        const fetchResult = await this._getRunner().fetchAndLogCompletion('missing', async () => {
            return await this._fetchMissingResult({maxEvents});
        });

        return this._getEventCount(fetchResult);
    }

    async _fetchScheduledResult({maxEvents}) {
        if (maxEvents < 300) {
            return 0;
        }

        return await this.service.fetchScheduled({maxEvents});
    }

    async fetchScheduled({maxEvents}) {
        const fetchResult = await this._getRunner().fetchAndLogCompletion('scheduled', async () => {
            return await this._fetchScheduledResult({maxEvents});
        });

        return this._getEventCount(fetchResult);
    }

    async startFetch() {
        await this._getRunner().start();
    }

    async startAutomationFetch() {
        await this._getAutomationRunner().start();
    }

    _restartFetch(reason) {
        this.fetching = false;
        logging.info(`[EmailAnalytics] Restarting fetch due to ${reason}`);
        this.startFetch();
    }

    _restartAutomationFetch(reason) {
        logging.info(`[EmailAnalytics] Restarting automation fetch due to ${reason}`);
        this.startAutomationFetch();
    }
}

module.exports = EmailAnalyticsServiceWrapper;
