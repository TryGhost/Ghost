const logging = require('@tryghost/logging');
const JobManager = require('../../services/jobs');
const path = require('path');

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
        const {MemberEmailAnalyticsUpdateEvent} = require('@tryghost/member-events');
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
            queries,
            domainEvents,
            prometheusClient
        });

        // We currently cannot trigger a non-offloaded job from the job manager
        // So the email analytics jobs simply emits an event.
        domainEvents.subscribe(StartEmailAnalyticsJobEvent, async () => {
            await this.startFetch();
        });

        domainEvents.subscribe(MemberEmailAnalyticsUpdateEvent, async (event) => {
            const memberId = event.data.memberId;
            await JobManager.addQueuedJob({
                name: `update-member-email-analytics-${memberId}`,
                metadata: {
                    job: path.resolve(__dirname, 'jobs/update-member-email-analytics'),
                    name: 'update-member-email-analytics',
                    data: {
                        memberId
                    }
                }
            });
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

        // NOTE: Data shows we can process ~2500 events per minute on Pro for a large-ish db (150k members).
        //       This can vary locally, but we should be conservative with the number of events we fetch.
        try {
            // Prioritize opens since they are the most important (only data directly displayed to users)
            const c1 = await this.fetchLatestOpenedEvents({maxEvents: 10000});
            if (c1 >= 10000) {
                this._restartFetch('high opened event count');
                return;
            }

            // Set limits on how much we fetch without checkings for opened events. During surge events (following newsletter send)
            //  we want to make sure we don't spend too much time collecting delivery data.
            const c2 = await this.fetchLatestNonOpenedEvents({maxEvents: 10000 - c1});
            const c3 = await this.fetchMissing({maxEvents: 10000 - c1 - c2});

            // Always restart immediately instead of waiting for the next scheduled job if we're fetching a lot of events
            if ((c1 + c2 + c3) > 10000) {
                this._restartFetch('high event count');
                return;
            }

            // Only backfill if we're not currently fetching a lot of events
            const c4 = await this.fetchScheduled({maxEvents: 10000});
            if (c4 > 0) {
                this._restartFetch('scheduled backfill');
                return;
            }
            
            this.fetching = false;
        } catch (e) {
            logging.error(e, 'Error while fetching email analytics');

            // Log again only the error, otherwise we lose the stack trace
            logging.error(e);
        }
        this.fetching = false;
    }

    _restartFetch(reason) {
        this.fetching = false;
        logging.info(`[EmailAnalytics] Restarting fetch due to ${reason}`);
        this.startFetch();
    }
}

module.exports = EmailAnalyticsServiceWrapper;
