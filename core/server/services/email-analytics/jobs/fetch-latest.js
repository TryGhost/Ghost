const logging = require('../../../../shared/logging');
const {parentPort} = require('worker_threads');
const debug = require('ghost-ignition').debug('jobs:email-analytics:fetch-latest');

// recurring job to fetch analytics since the most recently seen event timestamp

(async () => {
    try {
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

        logging.info(`Fetched ${eventStats.totalEvents} events and aggregated stats for ${eventStats.emailIds.length} emails in ${aggregateEndDate - fetchStartDate}ms`);

        if (parentPort) {
            parentPort.postMessage('done');
        } else {
            // give the logging pipes time finish writing before exit
            setTimeout(() => {
                process.exit(0);
            }, 1000);
        }
    } catch (error) {
        logging.error(error);

        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }
})();
