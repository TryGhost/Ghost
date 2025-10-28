const logging = require('@tryghost/logging');

class EmailAnalyticsServiceWrapper {
    init() {
        if (this.service) {
            return;
        }

        const EmailAnalyticsService = require('./EmailAnalyticsService');
        const EmailEventStorage = require('../email-service/EmailEventStorage');
        const EmailEventProcessor = require('../email-service/EmailEventProcessor');
        const MailgunProvider = require('./EmailAnalyticsProviderMailgun');
        const {EmailRecipientFailure, EmailSpamComplaintEvent, Email} = require('../../models');
        const StartEmailAnalyticsJobEvent = require('./events/StartEmailAnalyticsJobEvent');
        const domainEvents = require('@tryghost/domain-events');
        const config = require('../../../shared/config');
        const settings = require('../../../shared/settings-cache');
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
                new MailgunProvider({config, settings})
            ],
            queries,
            domainEvents,
            prometheusClient
        });

        // We currently cannot trigger a non-offloaded job from the job manager
        // So the email analytics jobs simply emits an event.
        domainEvents.subscribe(StartEmailAnalyticsJobEvent, async () => {
            await this.startFetch();
        });
    }

    async fetchLatestOpenedEvents({maxEvents, timingStats} = {maxEvents: Infinity}) {
        const totalEvents = await this.service.fetchLatestOpenedEvents({maxEvents, timingStats});
        return totalEvents;
    }

    async fetchLatestNonOpenedEvents({maxEvents, timingStats} = {maxEvents: Infinity}) {
        const totalEvents = await this.service.fetchLatestNonOpenedEvents({maxEvents, timingStats});
        return totalEvents;
    }

    async fetchMissing({maxEvents, timingStats} = {maxEvents: Infinity}) {
        const totalEvents = await this.service.fetchMissing({maxEvents, timingStats});
        return totalEvents;
    }

    async fetchScheduled({maxEvents, timingStats}) {
        if (maxEvents < 300) {
            return 0;
        }

        const totalEvents = await this.service.fetchScheduled({maxEvents, timingStats});
        return totalEvents;
    }

    async startFetch() {
        if (this.fetching) {
            logging.info('[EmailAnalytics] Job already running, skipping');
            return;
        }
        this.fetching = true;

        const jobStart = Date.now();
        logging.info('[EmailAnalytics] === Job Started ===');

        // Track timing across all stages
        const timingStats = {
            totalApiTime: 0,
            totalProcessingTime: 0,
            emailTime: 0,
            memberTime: 0
        };

        // NOTE: Data shows we can process ~2500 events per minute on Pro for a large-ish db (150k members).
        //       This can vary locally, but we should be conservative with the number of events we fetch.
        try {
            // Prioritize opens since they are the most important (only data directly displayed to users)
            const c1 = await this.fetchLatestOpenedEvents({maxEvents: 10000, timingStats});
            if (c1 >= 10000) {
                this._logJobSummary(jobStart, {opens: c1}, timingStats);
                this._restartFetch('high opened event count');
                return;
            }

            // Set limits on how much we fetch without checkings for opened events. During surge events (following newsletter send)
            //  we want to make sure we don't spend too much time collecting delivery data.
            const c2 = await this.fetchLatestNonOpenedEvents({maxEvents: 10000 - c1, timingStats});
            const c3 = await this.fetchMissing({maxEvents: 10000 - c1 - c2, timingStats});

            // Always restart immediately instead of waiting for the next scheduled job if we're fetching a lot of events
            if ((c1 + c2 + c3) > 10000) {
                this._logJobSummary(jobStart, {opens: c1, delivery: c2, missing: c3}, timingStats);
                this._restartFetch('high event count');
                return;
            }

            // Only backfill if we're not currently fetching a lot of events
            const c4 = await this.fetchScheduled({maxEvents: 10000, timingStats});
            if (c4 > 0) {
                this._logJobSummary(jobStart, {opens: c1, delivery: c2, missing: c3, scheduled: c4}, timingStats);
                this._restartFetch('scheduled backfill');
                return;
            }

            this._logJobSummary(jobStart, {opens: c1, delivery: c2, missing: c3, scheduled: c4}, timingStats);
            this.fetching = false;
        } catch (e) {
            logging.error(e, 'Error while fetching email analytics');

            // Log again only the error, otherwise we lose the stack trace
            logging.error(e);
        }
        this.fetching = false;
    }

    _logJobSummary(jobStart, counts, timingStats = {}) {
        const duration = Date.now() - jobStart;
        const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

        if (total === 0) {
            logging.info('[EmailAnalytics] === Job Complete: No events to process ===');
            return;
        }

        const parts = [];
        if (counts.opens) parts.push(`${counts.opens.toLocaleString()} opens`);
        if (counts.delivery) parts.push(`${counts.delivery.toLocaleString()} delivery`);
        if (counts.missing) parts.push(`${counts.missing.toLocaleString()} missing`);
        if (counts.scheduled) parts.push(`${counts.scheduled.toLocaleString()} scheduled`);

        const eventRate = Math.round(total / (duration / 1000));

        // Build timing breakdown
        const timingParts = [];
        if (timingStats.totalApiTime) {
            timingParts.push(`${(timingStats.totalApiTime / 1000).toFixed(1)}s API`);
        }

        // Calculate event processing time (total processing - aggregation)
        const eventProcessingTime = (timingStats.totalProcessingTime || 0) - (timingStats.emailTime || 0) - (timingStats.memberTime || 0);
        if (eventProcessingTime > 0) {
            timingParts.push(`${(eventProcessingTime / 1000).toFixed(1)}s events`);
        }

        if (timingStats.emailTime > 0) {
            timingParts.push(`${(timingStats.emailTime / 1000).toFixed(1)}s emails`);
        }

        if (timingStats.memberTime > 0) {
            timingParts.push(`${(timingStats.memberTime / 1000).toFixed(1)}s members`);
        }

        const timingBreakdown = timingParts.length > 0 ? ` (${timingParts.join(', ')})` : '';

        logging.info(`[EmailAnalytics] === Job Complete: ${total.toLocaleString()} events (${parts.join(', ')}) in ${(duration / 1000).toFixed(1)}s${timingBreakdown} (${eventRate} events/sec) ===`);
    }

    _restartFetch(reason) {
        this.fetching = false;
        this.startFetch();
    }
}

module.exports = EmailAnalyticsServiceWrapper;
