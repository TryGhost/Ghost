const path = require('path');
const jobsService = require('../../jobs');
const config = require('../../../../shared/config');

let hasScheduled = {
    processOutbox: false
};

module.exports = {
    async scheduleMemberWelcomeEmailJob() {
        if (!config.get('memberWelcomeEmailTestInbox')) {
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
