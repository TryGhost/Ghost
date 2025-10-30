const path = require('path');
const jobsService = require('../../jobs');
const labs = require('../../../../shared/labs');

let hasScheduled = {
    processOutbox: false
};

module.exports = {
    async scheduleWelcomeEmailJob() {
        if (!labs.isSet('welcomeEmails')) {
            return false;
        }

        if (!hasScheduled.processOutbox && !process.env.NODE_ENV.startsWith('test')) {
            jobsService.addJob({
                at: '0 */5 * * * *',
                job: path.resolve(__dirname, 'process-outbox.js'),
                name: 'welcome-emails-process-outbox'
            });

            hasScheduled.processOutbox = true;
        }

        return hasScheduled.processOutbox;
    }
};
