const {parentPort} = require('bthreads');
const debug = require('@tryghost/debug')('jobs:email-analytics:fetch-latest');

// recurring job to fetch analytics since the most recently seen event timestamp

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed when cancelling as everything is idempotent and will pick up
// where it left off on next run
function cancel() {
    if (parentPort) {
        parentPort.postMessage('Email analytics fetch-latest job cancelled before completion');
        parentPort.postMessage('cancelled');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

if (parentPort) {
    parentPort.once('message', (message) => {
        if (message === 'cancel') {
            return cancel();
        }
    });
}

(async () => {
    const config = require('../../../../shared/config');
    const db = require('../../../data/db');

    const logging = {
        info(message) {
            if (parentPort) {
                parentPort.postMessage(message);
            }
        },
        warn(message) {
            if (parentPort) {
                parentPort.postMessage(message);
            }
        },
        error(message) {
            if (parentPort) {
                parentPort.postMessage(message);
            }
        }
    };

    const settingsRows = await db.knex('settings')
        .whereIn('key', ['mailgun_api_key', 'mailgun_domain', 'mailgun_base_url']);

    const settingsCache = {};

    settingsRows.forEach((row) => {
        settingsCache[row.key] = row.value;
    });

    const settings = {
        get(key) {
            return settingsCache[key];
        }
    };

    const {EmailAnalyticsService} = require('@tryghost/email-analytics-service');
    const EventProcessor = require('../lib/event-processor');
    const MailgunProvider = require('@tryghost/email-analytics-provider-mailgun');
    const queries = require('../lib/queries');

    const emailAnalyticsService = new EmailAnalyticsService({
        config,
        settings,
        logging,
        eventProcessor: new EventProcessor({db, logging}),
        providers: [
            new MailgunProvider({config, settings, logging})
        ],
        queries
    });

    const fetchStartDate = new Date();
    debug('Starting email analytics fetch of latest events');
    const eventStats = await emailAnalyticsService.fetchLatest();
    const fetchEndDate = new Date();
    debug(`Finished fetching ${eventStats.totalEvents} analytics events in ${fetchEndDate - fetchStartDate}ms`);

    const aggregateStartDate = new Date();
    debug(`Starting email analytics aggregation for ${eventStats.emailIds.length} emails`);
    await emailAnalyticsService.aggregateStats(eventStats);
    const aggregateEndDate = new Date();
    debug(`Finished aggregating email analytics in ${aggregateEndDate - aggregateStartDate}ms`);

    if (parentPort) {
        parentPort.postMessage(`Fetched ${eventStats.totalEvents} events and aggregated stats for ${eventStats.emailIds.length} emails in ${aggregateEndDate - fetchStartDate}ms`);
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
