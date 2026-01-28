const path = require('path');
const jobsService = require('../../jobs');

let hasScheduled = {
    processOutbox: false
};

module.exports = {
    scheduleOutboxJob() {
        if (hasScheduled.processOutbox) {
            return false;
        }

        // Run every 3 seconds for instant welcome email delivery
        const cronSchedule = '*/3 * * * * *';

        jobsService.addJob({
            at: cronSchedule,
            job: path.resolve(__dirname, 'outbox-job.js'),
            name: 'process-outbox'
        });

        hasScheduled.processOutbox = true;
        return hasScheduled.processOutbox;
    }
};