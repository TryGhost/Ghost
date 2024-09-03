const logging = require('@tryghost/logging');

class EmailAnalyticsServiceWrapper {
    init() {
        if (this.service) {
            return;
        }

        const {EmailAnalyticsService} = require('@tryghost/email-analytics-service');
        const {EmailEventStorage, EmailEventProcessor} = require('@tryghost/email-service');
        const MailgunProvider = require('@tryghost/email-analytics-provider-mailgun');
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

        this.eventStorage = new EmailEventStorage({
            db,
            membersRepository,
            models: {
                Email,
                EmailRecipientFailure,
                EmailSpamComplaintEvent
            },
            emailSuppressionList
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

    async fetchLatestOpenedEvents({maxEvents} = {maxEvents: Infinity}) {
        logging.info('[EmailAnalytics] Fetch latest opened events started');

        const fetchStartDate = new Date();
        const totalEvents = await this.service.fetchLatestOpenedEvents({maxEvents});
        const fetchEndDate = new Date();

        logging.info(`[EmailAnalytics] Fetched ${totalEvents} events and aggregated stats in ${fetchEndDate.getTime() - fetchStartDate.getTime()}ms (latest opens)`);
        return totalEvents;
    }

    async fetchLatestNonOpenedEvents({maxEvents} = {maxEvents: Infinity}) {
        logging.info('[EmailAnalytics] Fetch latest non-opened events started');

        const fetchStartDate = new Date();
        const totalEvents = await this.service.fetchLatestNonOpenedEvents({maxEvents});
        const fetchEndDate = new Date();

        logging.info(`[EmailAnalytics] Fetched ${totalEvents} events and aggregated stats in ${fetchEndDate.getTime() - fetchStartDate.getTime()}ms (latest)`);
        return totalEvents;
    }

    async fetchMissing({maxEvents} = {maxEvents: Infinity}) {
        logging.info('[EmailAnalytics] Fetch missing events started');

        const fetchStartDate = new Date();
        const totalEvents = await this.service.fetchMissing({maxEvents});
        const fetchEndDate = new Date();

        logging.info(`[EmailAnalytics] Fetched ${totalEvents} events and aggregated stats in ${fetchEndDate.getTime() - fetchStartDate.getTime()}ms (missing)`);
        return totalEvents;
    }

    async fetchScheduled({maxEvents}) {
        if (maxEvents < 300) {
            return 0;
        }
        logging.info('[EmailAnalytics] Fetch scheduled events started');

        const fetchStartDate = new Date();
        const totalEvents = await this.service.fetchScheduled({maxEvents});
        const fetchEndDate = new Date();

        logging.info(`[EmailAnalytics] Fetched ${totalEvents} events and aggregated stats in ${fetchEndDate.getTime() - fetchStartDate.getTime()}ms (scheduled)`);
        return totalEvents;
    }

    async startFetch() {
        if (this.fetching) {
            logging.info('Email analytics fetch already running, skipping');
            return;
        }
        this.fetching = true;

        // NOTE: Data shows we can process ~7500 events per minute on Pro; this can vary locally
        try {
            // Prioritize opens since they are the most important (only data directly displayed to users)
            await this.fetchLatestOpenedEvents({maxEvents: Infinity});

            // Set limits on how much we fetch without checkings for opened events. During surge events (following newsletter send)
            //  we want to make sure we don't spend too much time collecting delivery data.
            const c1 = await this.fetchLatestNonOpenedEvents({maxEvents: 20000});
            if (c1 > 15000) { 
                this.fetching = false;
                logging.info('[EmailAnalytics] Restarting fetch due to high event count');
                this.startFetch();
                return;
            }
            const c2 = await this.fetchMissing({maxEvents: 20000});
            if ((c1 + c2) > 15000) {
                this.fetching = false;
                logging.info('[EmailAnalytics] Restarting fetch due to high event count');
                this.startFetch();
                return;
            }

            // Only fetch scheduled if we didn't fetch a lot of normal events
            await this.fetchScheduled({maxEvents: 20000 - c1 - c2});
            
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
