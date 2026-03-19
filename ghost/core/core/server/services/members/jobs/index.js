const path = require('path');
const jobsService = require('../../jobs');

let hasScheduled = {};

function scheduleDailyJob(name, jobFile, maxHour = 6) {
    if (!hasScheduled[name] && !process.env.NODE_ENV.startsWith('test')) {
        const s = Math.floor(Math.random() * 60);
        const m = Math.floor(Math.random() * 60);
        const h = Math.floor(Math.random() * maxHour);

        jobsService.addJob({
            at: `${s} ${m} ${h} * * *`,
            job: path.resolve(__dirname, jobFile),
            name
        });

        hasScheduled[name] = true;
    }
    return !!hasScheduled[name];
}

module.exports = {
    async scheduleExpiredCompCleanupJob() {
        return scheduleDailyJob('clean-expired-comped', 'clean-expired-comped.js');
    },
    async scheduleExpiredGiftedCleanupJob() {
        return scheduleDailyJob('clean-expired-gifted', 'clean-expired-gifted.js');
    },
    async scheduleTokenCleanupJob() {
        return scheduleDailyJob('clean-tokens', 'clean-tokens.js', 24);
    }
};
