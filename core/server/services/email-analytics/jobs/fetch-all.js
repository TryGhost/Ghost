const logging = require('../../../../shared/logging');
const emailAnalyticsService = require('../');

// one-off job to fetch all available events and re-process them idempotently
// NB. can be a _very_ long job for sites with many members and frequent emails

(async () => {
    try {
        const fetchStartDate = new Date();
        logging.info('Starting email analytics fetch of all available events');
        const eventStats = await emailAnalyticsService.fetchAll();
        logging.info(`Finished fetching ${eventStats.totalEvents} analytics events in ${Date.now() - fetchStartDate}ms`);

        const aggregateStartDate = new Date();
        logging.info(`Starting email analytics aggregation for ${eventStats.emailIds.length} emails`);
        await emailAnalyticsService.aggregateStats(eventStats);
        logging.info(`Finished aggregating email analytics in ${Date.now() - aggregateStartDate}ms`);

        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    } catch (error) {
        logging.error(error);

        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(1);
        }, 2000);
    }
})();
