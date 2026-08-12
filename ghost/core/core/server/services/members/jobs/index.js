const path = require('path');
const jobsService = require('../../jobs');
const jobsServiceV2 = require('../../jobs/v2').default;
const labs = require('../../../../shared/labs');
const CleanTokensJob = require('./clean-tokens-job');

let hasScheduled = {
    expiredComped: false,
    tokens: false
};

function randomDailyCron(maxHour) {
    const s = Math.floor(Math.random() * 60);
    const m = Math.floor(Math.random() * 60);
    const h = Math.floor(Math.random() * maxHour);

    return `${s} ${m} ${h} * * *`;
}

function scheduleJob(key, name, jobFile, maxHour = 6) {
    if (hasScheduled[key] || process.env.NODE_ENV.startsWith('test')) {
        return hasScheduled[key];
    }

    jobsService.addJob({
        at: randomDailyCron(maxHour),
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
        if (labs.isSet('jobsV2')) {
            // The v2 path is scheduled by boot's initBackgroundServices via
            // scheduleTokenCleanupJobV2, after job handlers have registered.
            return false;
        }

        return scheduleJob('tokens', 'clean-tokens', 'clean-tokens.js', 24);
    },

    async scheduleTokenCleanupJobV2() {
        if (!labs.isSet('jobsV2')) {
            return false;
        }

        if (hasScheduled.tokens || process.env.NODE_ENV.startsWith('test')) {
            return hasScheduled.tokens;
        }

        // Same randomised daily cadence the legacy bree schedule used: any
        // hour of the day, since tokens live 24 hours regardless.
        await jobsServiceV2.scheduleRecurring(new CleanTokensJob(), {cron: randomDailyCron(24)});

        hasScheduled.tokens = true;

        return true;
    }
};
