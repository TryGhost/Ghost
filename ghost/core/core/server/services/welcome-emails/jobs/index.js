const path = require('path');
const jobsService = require('../../jobs');

let hasScheduled = {
    processOutbox: false
};

module.exports = {
    async scheduleWelcomeEmailJob() {
        if (!hasScheduled.processOutbox && !process.env.NODE_ENV.startsWith('test')) {
            jobsService.addJob({
                at: '*/10 * * * * *',
                job: path.resolve(__dirname, 'process-outbox.js'),
                name: 'welcome-emails-process-outbox'
            });

            hasScheduled.processOutbox = true;
        }

        return hasScheduled.processOutbox;
    }
};
