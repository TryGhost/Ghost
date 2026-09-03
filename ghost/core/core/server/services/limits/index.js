const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const { LimitService } = require('@tryghost/limit-service');

const config = require('../../../shared/config');
const db = require('../../data/db');
const { counters, formatters } = require('./counters');

const limitService = new LimitService();

/**
 * Build this site's limits from the configuration its host supplied.
 *
 * Safe to call again whenever that configuration changes: limits are resolved from scratch
 * and swapped in, and nothing holding a reference to this service needs to know.
 */
const init = () => {
  const hostSettings = config.get('hostSettings') || {};

  const helpLink =
    hostSettings.billing?.enabled === true && hostSettings.billing?.url
      ? hostSettings.billing.url
      : 'https://ghost.org/help/';

  const subscription = hostSettings.subscription
    ? { startDate: hostSettings.subscription.start, interval: 'month' }
    : undefined;

  try {
    limitService.loadLimits({
      limits: hostSettings.limits || {},
      counters,
      formatters,
      subscription,
      helpLink,
      db,
      errors,
    });
  } catch (error) {
    // Misusing the limit service is a programming error, not a reason to stop a site
    // booting. Kept from before: configuration problems are reported rather than thrown
    // now, but a mistake here still must not take a site down.
    if (error instanceof errors.IncorrectUsageError) {
      logging.warn(error);
      return;
    }

    throw error;
  }

  // A limit its host is charging for that cannot be applied here is worth saying out loud.
  // Previously the first one of these took down every limit after it, silently.
  for (const problem of limitService.problems) {
    logging.warn(`Host limit "${problem.limit}" was configured but not applied: ${problem.reason}`);
  }
};

module.exports = limitService;

module.exports.init = init;
