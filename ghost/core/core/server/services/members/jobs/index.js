const path = require('path');
const jobsService = require('../../jobs');

let hasScheduled = {
    expiredComped: false,
    tokens: false
};

module.exports = {
    async scheduleExpiredCompCleanupJob() {
        if (
            !hasScheduled.expiredComped &&
            !process.env.NODE_ENV.startsWith('test')
        ) {
            // use a random seconds value to avoid spikes to external APIs on the minute
            const s = Math.floor(Math.random() * 60); // 0-59
            const m = Math.floor(Math.random() * 60); // 0-59
            const h = Math.floor(Math.random() * 6); // 0-5

            // Run everyday at {0-5}:XX:XX AM to clean all expired complimentary subscriptions
            jobsService.addJob({
                at: `${s} ${m} ${h} * * *`,
                job: path.resolve(__dirname, 'clean-expired-comped.js'),
                name: 'clean-expired-comped'
            });

            hasScheduled.expiredComped = true;
        }

        return hasScheduled.expiredComped;
    },

    async scheduleTokenCleanupJob() {
        if (
            !hasScheduled.tokens &&
            !process.env.NODE_ENV.startsWith('test')
        ) {
            // use a random seconds/minutes/hours value to avoid delete spikes to the database
            const s = Math.floor(Math.random() * 60); // 0-59
            const m = Math.floor(Math.random() * 60); // 0-59
            const h = Math.floor(Math.random() * 24); // 0-23

            jobsService.addJob({
                at: `${s} ${m} ${h} * * *`, // Every day
                job: require('path').resolve(__dirname, 'clean-tokens.js'),
                name: 'clean-tokens'
            });

            hasScheduled.tokens = true;
        }

        return hasScheduled.tokens;
    }
};
