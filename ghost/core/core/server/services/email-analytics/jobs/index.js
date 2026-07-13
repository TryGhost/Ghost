const config = require('../../../../shared/config');
const labs = require('../../../../shared/labs');
const models = require('../../../models');
const jobsService = require('../../jobs');
const {EmailAnalyticsJobScheduler} = require('./email-analytics-job-scheduler');

const emailAnalyticsJobScheduler = new EmailAnalyticsJobScheduler({
    models,
    config,
    labs,
    jobManager: jobsService
});

/**
 * @param {Parameters<typeof EmailAnalyticsJobScheduler.prototype.scheduleRecurringNewslettersJob>} args
 * @returns {Promise<void>}
 */
exports.scheduleRecurringNewslettersJob = async (...args) => {
    if (!process.env.NODE_ENV.startsWith('test')) {
        await emailAnalyticsJobScheduler.scheduleRecurringNewslettersJob(...args);
    }
};

/**
 * @param {Parameters<typeof EmailAnalyticsJobScheduler.prototype.scheduleRecurringAutomationsJob>} args
 * @returns {Promise<void>}
 */
exports.scheduleRecurringAutomationsJob = async (...args) => {
    if (!process.env.NODE_ENV.startsWith('test')) {
        await emailAnalyticsJobScheduler.scheduleRecurringAutomationsJob(...args);
    }
};
