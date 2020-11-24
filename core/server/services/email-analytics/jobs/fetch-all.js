const logging = require('../../../../shared/logging');
const {parentPort} = require('worker_threads');

// one-off job to fetch all available events and re-process them idempotently
// NB. can be a _very_ long job for sites with many members and frequent emails

(async () => {
    const models = require('../../../models');
    const settingsService = require('../../settings');

    // must be initialized before emailAnalyticsService is required otherwise
    // requires are in the wrong order and settingsCache will always be empty
    await models.init();
    await settingsService.init();

    const emailAnalyticsService = require('../');

    const fetchStartDate = new Date();
    logging.info('Starting email analytics fetch of all available events');
    const eventStats = await emailAnalyticsService.fetchAll();
    logging.info(`Finished fetching ${eventStats.totalEvents} analytics events in ${Date.now() - fetchStartDate}ms`);

    const aggregateStartDate = new Date();
    logging.info(`Starting email analytics aggregation for ${eventStats.emailIds.length} emails`);
    await emailAnalyticsService.aggregateStats(eventStats);
    logging.info(`Finished aggregating email analytics in ${Date.now() - aggregateStartDate}ms`);

    if (parentPort) {
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
