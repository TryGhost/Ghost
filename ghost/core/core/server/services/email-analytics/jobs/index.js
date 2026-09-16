const config = require('../../../../shared/config');
const models = require('../../../models');
const jobManager = require('../../jobs');
const jobsService = require('../../jobs-service');
const { EmailAnalyticsJobScheduler } = require('./email-analytics-job-scheduler');

const emailAnalyticsJobScheduler = new EmailAnalyticsJobScheduler({
  models,
  config,
  jobManager,
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
  if (!process.env.NODE_ENV?.startsWith('test')) {
    await emailAnalyticsJobScheduler.scheduleRecurringNewslettersJob(...args);
  }
};

/**
 * @param {Parameters<typeof EmailAnalyticsJobScheduler.prototype.scheduleRecurringAutomationsJob>} args
 * @returns {Promise<void>}
 */
exports.scheduleRecurringAutomationsJob = async (...args) => {
  if (!process.env.NODE_ENV?.startsWith('test')) {
    await emailAnalyticsJobScheduler.scheduleRecurringAutomationsJob(...args);
  }
};

/**
 * @param {Parameters<typeof EmailAnalyticsJobScheduler.prototype.scheduleRecurringGiftDeliveriesJob>} args
 * @returns {Promise<void>}
 */
exports.scheduleRecurringGiftDeliveriesJob = async (...args) => {
  if (!process.env.NODE_ENV?.startsWith('test')) {
    await emailAnalyticsJobScheduler.scheduleRecurringGiftDeliveriesJob(...args);
  }
};
