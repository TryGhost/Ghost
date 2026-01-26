const path = require('path');
const jobsService = require('../../jobs');
const config = require('../../../../shared/config');

let hasScheduled = {
    processOutbox: false
};

module.exports = {
    scheduleOutboxJob() {
        if (hasScheduled.processOutbox) {
            return false;
        }

        const configValue = config.get('memberWelcomeEmailSendInstantly');
        const testEmailSendInstantly = configValue === true || configValue === 'true';

        // use a random seconds value to avoid spikes to the database on the minute
        const s = Math.floor(Math.random() * 60); // 0-59
        // run every 5 minutes, on 1,6,11..., 2,7,12..., 3,8,13..., etc
        const m = Math.floor(Math.random() * 5); // 0-4

        const cronSchedule = testEmailSendInstantly ? '*/3 * * * * *' : `${s} ${m}/5 * * * *`;

        jobsService.addJob({
            at: cronSchedule,
            job: path.resolve(__dirname, 'outbox-job.js'),
            name: 'process-outbox'
        });

        hasScheduled.processOutbox = true;
        return hasScheduled.processOutbox;
    }
};