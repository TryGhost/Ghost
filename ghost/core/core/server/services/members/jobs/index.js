const logging = require('@tryghost/logging');
const CleanTokensJob = require('./clean-tokens-job').default;
const CleanExpiredCompedJob = require('./clean-expired-comped-job').default;

let hasScheduled = {
  expiredComped: false,
  tokens: false,
};

function alreadyScheduledOrTest(key) {
  return hasScheduled[key] || process.env.NODE_ENV.startsWith('test');
}

function randomDailyCron(maxHour = 24) {
  const s = Math.floor(Math.random() * 60);
  const m = Math.floor(Math.random() * 60);
  const h = Math.floor(Math.random() * maxHour);
  return `${s} ${m} ${h} * * *`;
}

module.exports = {
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
