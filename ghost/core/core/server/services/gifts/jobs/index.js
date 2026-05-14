const path = require('path');
const jobsService = require('../../jobs');

let hasScheduled = {
    cleanup: false,
    reminders: false
};

function scheduleJob(key, name, jobFile) {
    if (hasScheduled[key] || process.env.NODE_ENV?.startsWith('test')) {
        return hasScheduled[key];
    }

    // randomise the schedule so the job doesn't fire at the same instant
    // across every Ghost instance - spreads load across the day and avoids
    // DB spikes on the hour. Hour is bounded to a 0-5am off-peak window.
    const s = Math.floor(Math.random() * 60);
    const m = Math.floor(Math.random() * 60);
    const h = Math.floor(Math.random() * 6);

    jobsService.addJob({
        at: `${s} ${m} ${h} * * *`,
        job: path.resolve(__dirname, jobFile),
        name
    });

    hasScheduled[key] = true;

    return true;
}

module.exports = {
    scheduleGiftCleanupJob() {
        return scheduleJob('cleanup', 'clean-gifts', 'clean-gifts-job.js');
    },

    scheduleGiftReminderJob() {
        return scheduleJob('reminders', 'send-gift-reminders', 'send-gift-reminders-job.js');
    }
};
