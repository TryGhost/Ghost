const path = require('path');
const logging = require('@tryghost/logging');
const jobManager = require('../../jobs');
const CleanGiftsJob = require('./clean-gifts-job').default;

let hasScheduled = {
  cleanup: false,
  reminders: false,
};

function alreadyScheduledOrTest(key) {
  return hasScheduled[key] || process.env.NODE_ENV?.startsWith('test');
}

// randomise the schedule so the job doesn't fire at the same instant
// across every Ghost instance - spreads load across the day and avoids
// DB spikes on the hour. Hour is bounded to a 0-5am off-peak window.
function randomOffPeakDailyCron() {
  const s = Math.floor(Math.random() * 60);
  const m = Math.floor(Math.random() * 60);
  const h = Math.floor(Math.random() * 6);

  return `${s} ${m} ${h} * * *`;
}

function scheduleJob(key, name, jobFile) {
  if (alreadyScheduledOrTest(key)) {
    return hasScheduled[key];
  }

  const at = randomOffPeakDailyCron();

  logging.info(`[Background Job] ${name} scheduled at ${at}`);
  jobManager.addJob({
    at,
    job: path.resolve(__dirname, jobFile),
    name,
  });

  hasScheduled[key] = true;

  return true;
}

module.exports = {
  async scheduleGiftCleanupJob(classBasedJobs) {
    if (alreadyScheduledOrTest('cleanup')) {
      return;
    }

    const cron = randomOffPeakDailyCron();
    logging.info(`[Background Job] clean-gifts scheduled at ${cron}`);
    await classBasedJobs.scheduleRecurring(new CleanGiftsJob(), { cron });

    hasScheduled.cleanup = true;
  },

  scheduleGiftReminderJob() {
    return scheduleJob('reminders', 'send-gift-reminders', 'send-gift-reminders-job.js');
  },
};
