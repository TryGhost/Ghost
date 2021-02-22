const {parentPort} = require('bthreads');
const debug = require('ghost-ignition').debug('jobs:email-analytics:fetch-latest');

// recurring job to fetch analytics since the most recently seen event timestamp

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed when cancelling as everything is idempotent and will pick up
// where it left off on next run
function cancel() {
    parentPort.postMessage('Email analytics fetch-latest job cancelled before completion');

    if (parentPort) {
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
    const models = require('../../../models');
    const settingsService = require('../../settings');

    // must be initialized before emailAnalyticsService is required otherwise
    // requires are in the wrong order and settingsCache will always be empty
    await models.init();
    await settingsService.init();

    const emailAnalyticsService = require('../');

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

    parentPort.postMessage(`Fetched ${eventStats.totalEvents} events and aggregated stats for ${eventStats.emailIds.length} emails in ${aggregateEndDate - fetchStartDate}ms`);

    if (parentPort) {
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
