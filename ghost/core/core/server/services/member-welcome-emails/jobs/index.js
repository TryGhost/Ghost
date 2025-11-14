const path = require('path');
const jobsService = require('../../jobs');
const labs = require('../../../../shared/labs');

let hasScheduled = {
    processOutbox: false
};

module.exports = {
    async scheduleMemberWelcomeEmailJob() {
        if (!labs.isSet('welcomeEmails')) {
            return false;
        }

        if (!hasScheduled.processOutbox && !process.env.NODE_ENV.startsWith('test')) {
            jobsService.addJob({
                at: '0 */5 * * * *',
                job: path.resolve(__dirname, 'process-outbox.js'),
                name: 'process-member-welcome-emails'
            });

            hasScheduled.processOutbox = true;
        }

        return hasScheduled.processOutbox;
    }
};
