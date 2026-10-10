const logging = require('@tryghost/logging');
const CleanGiftsJob = require('./clean-gifts-job').default;
const SendGiftRemindersJob = require('./send-gift-reminders-job').default;

const hasScheduled = {
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

module.exports = {
  async scheduleGiftCleanupJob(jobsService) {
    if (alreadyScheduledOrTest('cleanup')) {
      return;
    }

    const cron = randomOffPeakDailyCron();
    logging.info(`[Background Job] clean-gifts scheduled at ${cron}`);
    await jobsService.scheduleRecurring(new CleanGiftsJob(), { cron });

    hasScheduled.cleanup = true;
  },

  async scheduleGiftReminderJob(jobsService) {
    if (alreadyScheduledOrTest('reminders')) {
      return;
    }

    const cron = randomOffPeakDailyCron();
    logging.info(`[Background Job] send-gift-reminders scheduled at ${cron}`);
    await jobsService.scheduleRecurring(new SendGiftRemindersJob(), { cron });

    hasScheduled.reminders = true;
  },
};
