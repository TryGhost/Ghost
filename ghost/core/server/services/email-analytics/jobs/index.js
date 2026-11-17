const config = require('../../../../shared/config');
const models = require('../../../models');
const jobsService = require('../../jobs-service');
const { EmailAnalyticsJobScheduler } = require('./email-analytics-job-scheduler');

const emailAnalyticsJobScheduler = new EmailAnalyticsJobScheduler({
  models,
  config,
  // Resolved per call: this module loads before boot initializes the jobs
  // service, and scheduling only happens once it has started.
  jobsService: {
    scheduleRecurring: (job, schedule) =>
      jobsService.getInstance().scheduleRecurring(job, schedule),
  },
});

/**
 * @param {Parameters<typeof EmailAnalyticsJobScheduler.prototype.scheduleRecurringNewslettersJob>} args
 * @returns {Promise<void>}
 */
exports.scheduleRecurringNewslettersJob = async (...args) => {
  await emailAnalyticsJobScheduler.scheduleRecurringNewslettersJob(...args);
};

/**
 * @param {Parameters<typeof EmailAnalyticsJobScheduler.prototype.scheduleRecurringAutomationsJob>} args
 * @returns {Promise<void>}
 */
exports.scheduleRecurringAutomationsJob = async (...args) => {
  await emailAnalyticsJobScheduler.scheduleRecurringAutomationsJob(...args);
};

/**
 * @param {Parameters<typeof EmailAnalyticsJobScheduler.prototype.scheduleRecurringGiftDeliveriesJob>} args
 * @returns {Promise<void>}
 */
exports.scheduleRecurringGiftDeliveriesJob = async (...args) => {
  await emailAnalyticsJobScheduler.scheduleRecurringGiftDeliveriesJob(...args);
};
