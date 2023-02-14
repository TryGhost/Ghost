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
        // Instead of processing all events directy, we do a little loop
        // Because otherwise we could be fetching for 30 minutes without updating the aggrage stats
        // Instead, we fetch ±1000 at a time and stop if we reached a time limit or 0 new events

        const loopStartDate = new Date();
        let fetchCount = 0;

        for (let index = 0; index < 100; index++) {
            const fetchStartDate = new Date();
            debug('Starting email analytics fetch of latest events');
            const eventStats = await this.service.fetchLatest({maxEvents: 5100});
            fetchCount += eventStats.totalEvents;

            const fetchEndDate = new Date();
            debug(`Finished fetching ${eventStats.totalEvents} analytics events in ${fetchEndDate.getTime() - fetchStartDate.getTime()}ms`);

            const aggregateStartDate = new Date();
            debug(`Starting email analytics aggregation for ${eventStats.emailIds.length} emails`);
            await this.service.aggregateStats(eventStats);
            const aggregateEndDate = new Date();
            debug(`Finished aggregating email analytics in ${aggregateEndDate.getTime() - aggregateStartDate.getTime()}ms`);
            logging.info(`[EmailAnalytics] Fetched ${eventStats.totalEvents} events and aggregated stats for ${eventStats.emailIds.length} emails in ${aggregateEndDate.getTime() - fetchStartDate.getTime()}ms (iteration ${index + 1})`);

            // Stop if more than 5 minutes working
            if (eventStats.totalEvents < 5100 || aggregateEndDate.getTime() - loopStartDate.getTime() > 5 * 60 * 1000) {
                break;
            }
        }

        const loopEndTime = new Date();
        logging.info(`[EmailAnalytics] Total: ${fetchCount} events in ${loopEndTime.getTime() - loopStartDate.getTime()}ms`);

        return fetchCount;
    }

    async fetchMissing() {
        const fetchStartDate = new Date();

        const eventStats = await this.service.fetchMissing({maxEvents: 1000});
        await this.service.aggregateStats(eventStats);

        const aggregateEndDate = new Date();

        logging.info(`Fetched ${eventStats.totalEvents} events and aggregated stats for ${eventStats.emailIds.length} emails in ${aggregateEndDate.getTime() - fetchStartDate.getTime()}ms`);

        return eventStats;
    }

    async startFetch() {
        if (this.fetching) {
            logging.info('Email analytics fetch already running, skipping');
            return;
        }
        this.fetching = true;

        try {
            logging.info('[EmailAnalytics] Fetch latest started');
            await this.fetchLatest();

            logging.info('[EmailAnalytics] Fetch missing started');
            await this.fetchMissing();

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
