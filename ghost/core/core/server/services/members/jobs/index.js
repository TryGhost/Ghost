const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const CleanTokensJob = require('./clean-tokens-job').default;
const CleanExpiredCompedJob = require('./clean-expired-comped-job').default;
const cleanTokensTask = require('./clean-tokens-task').default;
const cleanExpiredCompedTask = require('./clean-expired-comped-task').default;

let hasScheduled = {
  expiredComped: false,
  tokens: false,
};

let tasks;

function alreadyScheduledOrTest(key) {
  return hasScheduled[key] || process.env.NODE_ENV.startsWith('test');
}

function randomDailyCron(maxHour = 24) {
  const s = Math.floor(Math.random() * 60);
  const m = Math.floor(Math.random() * 60);
  const h = Math.floor(Math.random() * maxHour);
  return `${s} ${m} ${h} * * *`;
}

function getTasks() {
  if (!tasks) {
    throw new errors.IncorrectUsageError({
      message: 'Member jobs used before init(). Call init() from boot first.',
    });
  }
  return tasks;
}

module.exports = {
  // Composition root for the member cleanup tasks. Idempotent because tests
  // may boot more than once per process.
  init() {
    if (tasks) {
      return;
    }

    const db = require('../../../data/db');
    const models = require('../../../models');
    const events = require('../../../lib/common/events');
    const sentry = require('../../../../shared/sentry');

    tasks = {
      cleanTokens: () => cleanTokensTask({ db, logging }),
      cleanExpiredComped: () => cleanExpiredCompedTask({ db, models, events, logging, sentry }),
    };
  },

  cleanTokens() {
    return getTasks().cleanTokens();
  },

  cleanExpiredComped() {
    return getTasks().cleanExpiredComped();
  },

  async scheduleExpiredCompCleanupJob(jobsService) {
    if (alreadyScheduledOrTest('expiredComped')) {
      return;
    }

    // Keep the legacy off-peak window: a random time between 00:00 and 05:59
    const cron = randomDailyCron(6);
    logging.info(`[Background Job] clean-expired-comped scheduled at ${cron}`);
    await jobsService.scheduleRecurring(new CleanExpiredCompedJob(), { cron });

    hasScheduled.expiredComped = true;
  },

  async scheduleTokenCleanupJob(jobsService) {
    if (alreadyScheduledOrTest('tokens')) {
      return;
    }

    const cron = randomDailyCron();
    logging.info(`[Background Job] clean-tokens scheduled at ${cron}`);
    await jobsService.scheduleRecurring(new CleanTokensJob(), { cron });

    hasScheduled.tokens = true;
  },
};
