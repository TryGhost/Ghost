const path = require('path');
const logging = require('@tryghost/logging');
const jobsService = require('../../jobs');

let hasScheduled = {
    expiredComped: false,
    tokens: false
};

function scheduleJob(key, name, jobFile, maxHour = 6) {
    if (hasScheduled[key] || process.env.NODE_ENV.startsWith('test')) {
        return hasScheduled[key];
    }

    const s = Math.floor(Math.random() * 60);
    const m = Math.floor(Math.random() * 60);
    const h = Math.floor(Math.random() * maxHour);

    const at = `${s} ${m} ${h} * * *`;

    logging.info(`[Background Job] ${name} scheduled at ${at}`);
    jobsService.addJob({
        at,
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
        return scheduleJob('tokens', 'clean-tokens', 'clean-tokens.js', 24);
    }
};
