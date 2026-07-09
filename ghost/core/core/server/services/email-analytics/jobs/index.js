const config = require('../../../../shared/config');
const models = require('../../../models');
const jobsService = require('../../jobs');
const {EmailAnalyticsJobScheduler} = require('./email-analytics-job-scheduler');

const emailAnalyticsJobScheduler = new EmailAnalyticsJobScheduler(models, config, jobsService);

/**
 * @param {Parameters<typeof EmailAnalyticsJobScheduler.prototype.scheduleRecurringJobs>} args
 * @returns {Promise<void>}
 */
exports.scheduleRecurringJobs = async (...args) => {
    if (!process.env.NODE_ENV.startsWith('test')) {
        await emailAnalyticsJobScheduler.scheduleRecurringJobs(...args);
    }
};
