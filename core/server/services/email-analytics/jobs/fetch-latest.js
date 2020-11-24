const logging = require('../../../../shared/logging');
const {parentPort} = require('worker_threads');

// recurring job to fetch analytics since the most recently seen event timestamp

// pass `maxEvents` option when fetching analytics to help timebox the job so that we don't have
// long-running jobs preventing orderly shutdown (note: Mailgun fetches 300 events per page)
const MAX_EVENTS = 3000;

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
        logging.info('Starting email analytics fetch of latest events');
        const eventStats = await emailAnalyticsService.fetchLatest({maxEvents: MAX_EVENTS});
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
    } catch (error) {
        logging.error(error);

        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }
})();
