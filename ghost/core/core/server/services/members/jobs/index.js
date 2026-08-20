const path = require('path');
const jobsService = require('../../jobs');
const CleanTokensJob = require('./clean-tokens-job').default;

let hasScheduled = {
    expiredComped: false,
    tokens: false
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

function scheduleJob(key, name, jobFile, maxHour = 6) {
    if (alreadyScheduledOrTest(key)) {
        return hasScheduled[key];
    }

    const s = Math.floor(Math.random() * 60);
    const m = Math.floor(Math.random() * 60);
    const h = Math.floor(Math.random() * maxHour);

    jobsService.addJob({
        at: `${s} ${m} ${h} * * *`,
        job: path.resolve(__dirname, jobFile),
        name
    });

    hasScheduled[key] = true;

    return true;
}

module.exports = {
    async scheduleExpiredCompCleanupJob() {
        return scheduleJob('expiredComped', 'clean-expired-comped', 'clean-expired-comped.js');
    },

    async scheduleTokenCleanupJob() {
        if (alreadyScheduledOrTest('tokens')) {
            return;
        }

        const classBasedJobs = require('../../jobs-service').getInstance();
        await classBasedJobs.scheduleRecurring(new CleanTokensJob(), {cron: randomDailyCron()});

        hasScheduled.tokens = true;
    }
};
