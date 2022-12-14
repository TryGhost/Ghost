const path = require('path');
const jobsService = require('../../jobs');

let hasScheduled = false;

module.exports = {
    async scheduleExpiredCompCleanupJob() {
        if (
            !hasScheduled &&
            !process.env.NODE_ENV.startsWith('test')
        ) {
            // use a random seconds value to avoid spikes to external APIs on the minute
            const s = Math.floor(Math.random() * 60); // 0-59

            // Run everyday at 12:05:X AM to clean all expired complimentary subscriptions
            jobsService.addJob({
                at: `${s} 5 0 * * *`,
                job: path.resolve(__dirname, 'clean-expired-comped.js'),
                name: 'clean-expired-comped'
            });

            hasScheduled = true;
        }

        return hasScheduled;
    }
};
