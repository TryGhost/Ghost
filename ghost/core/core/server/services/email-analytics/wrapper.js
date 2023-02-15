const logging = require('@tryghost/logging');
const debug = require('@tryghost/debug')('jobs:email-analytics:fetch-latest');

class EmailAnalyticsServiceWrapper {
    init() {
        if (this.service) {
            return;
        }

        const {EmailAnalyticsService} = require('@tryghost/email-analytics-service');
        const {EmailEventStorage, EmailEventProcessor} = require('@tryghost/email-service');
        const MailgunProvider = require('@tryghost/email-analytics-provider-mailgun');
        const {EmailRecipientFailure, EmailSpamComplaintEvent} = require('../../models');
        const StartEmailAnalyticsJobEvent = require('./events/StartEmailAnalyticsJobEvent');

        const domainEvents = require('@tryghost/domain-events');
        const config = require('../../../shared/config');
        const settings = require('../../../shared/settings-cache');
        const db = require('../../data/db');
        const queries = require('./lib/queries');
        const membersService = require('../members');
        const membersRepository = membersService.api.members;

        this.eventStorage = new EmailEventStorage({
            db,
            membersRepository,
            models: {
                EmailRecipientFailure,
                EmailSpamComplaintEvent
            }
        });

        // Since this is running in a worker thread, we cant dispatch directly
        // So we post the events as a message to the job manager
        const eventProcessor = new EmailEventProcessor({
            domainEvents,
            db,
            eventStorage: this.eventStorage
        });

        this.service = new EmailAnalyticsService({
            config,
            settings,
            eventProcessor,
            providers: [
                new MailgunProvider({config, settings})
            ],
            queries
        });

        // We currently cannot trigger a non-offloaded job from the job manager
        // So the email analytics jobs simply emits an event.
        domainEvents.subscribe(StartEmailAnalyticsJobEvent, async () => {
            await this.startFetch();
        });
    }

    async fetchLatest() {
        logging.info('[EmailAnalytics] Fetch latest started');

        const fetchStartDate = new Date();
        const totalEvents = await this.service.fetchLatest({}); // No maximum, as these events are the most important
        const fetchEndDate = new Date();

        logging.info(`[EmailAnalytics] Fetched ${totalEvents} events and aggregated stats in ${fetchEndDate.getTime() - fetchStartDate.getTime()}ms`);
        return totalEvents;
    }

    async fetchMissing() {
        logging.info('[EmailAnalytics] Fetch missing started');

        const fetchStartDate = new Date();
        const totalEvents = await this.service.fetchMissing({maxEvents: 5100}); // Maximum so we don't delay fetchLatest too much
        const fetchEndDate = new Date();

        logging.info(`[EmailAnalytics] Fetched ${totalEvents} events and aggregated stats in ${fetchEndDate.getTime() - fetchStartDate.getTime()}ms`);
        return totalEvents;
    }

    async fetchScheduled() {
        logging.info('[EmailAnalytics] Fetch scheduled started');

        const fetchStartDate = new Date();
        const totalEvents = await this.service.fetchScheduled({maxEvents: 5100}); // Maximum so we don't delay fetchLatest too much
        const fetchEndDate = new Date();

        logging.info(`[EmailAnalytics] Fetched ${totalEvents} events and aggregated stats in ${fetchEndDate.getTime() - fetchStartDate.getTime()}ms`);
        return totalEvents;
    }

    async startFetch() {
        if (this.fetching) {
            logging.info('Email analytics fetch already running, skipping');
            return;
        }
        this.fetching = true;

        try {
            await this.fetchLatest();
            await this.fetchMissing();
            await this.fetchScheduled();

            this.fetching = false;
        } catch (e) {
            logging.error(e, 'Error while fetching email analytics');

            // Log again only the error, otherwise we lose the stack trace
            logging.error(e);
        }
        this.fetching = false;
    }
}

module.exports = EmailAnalyticsServiceWrapper;
