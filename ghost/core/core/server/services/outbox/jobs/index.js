const path = require('path');
const config = require('../../../../shared/config');
const jobsService = require('../../jobs');

let hasScheduled = {
    processOutbox: false
};

module.exports = {
    scheduleOutboxJob() {
        if (hasScheduled.processOutbox) {
            return false;
        }

        // Allow overriding the cron schedule via config for faster dev/testing
        // e.g. "*/5 * * * * *" for every 5 seconds
        const configuredSchedule = config.get('outbox:cronSchedule');

        let cronSchedule;
        if (configuredSchedule) {
            cronSchedule = configuredSchedule;
        } else {
            // use a random seconds value to avoid spikes to the database on the minute
            const s = Math.floor(Math.random() * 60); // 0-59
            // run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc
            const m = Math.floor(Math.random() * 5); // 0-4
            cronSchedule = `${s} ${m}/5 * * * *`;
        }

        jobsService.addJob({
            at: cronSchedule,
            job: path.resolve(__dirname, 'outbox-job.js'),
            name: 'process-outbox'
        });

        hasScheduled.processOutbox = true;
        return hasScheduled.processOutbox;
    }
};