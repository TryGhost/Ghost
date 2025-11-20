const path = require('path');
const jobsService = require('../../jobs');
const config = require('../../../../shared/config');

let hasScheduled = {
    processOutbox: false
};

module.exports = {
    async scheduleMemberWelcomeEmailJob() {
        const testInboxDisabled = !config.get('memberWelcomeEmailTestInbox');
        const testEmailSentInstantly = config.get('memberWelcomeEmailSendInstantly') === 'true';
        const alreadySetScheduledProcessing = hasScheduled.processOutbox;

        if (testInboxDisabled || alreadySetScheduledProcessing) {
            return false;
        }

        hasScheduled.processOutbox = true;
        const cronSchedule = testEmailSentInstantly ? '*/3 * * * * *' : '0 */5 * * * *';

        jobsService.addJob({
            at: cronSchedule,
            job: path.resolve(__dirname, 'process-outbox.js'),
            name: 'process-member-welcome-emails'
        });

        return hasScheduled.processOutbox;
    }
};
