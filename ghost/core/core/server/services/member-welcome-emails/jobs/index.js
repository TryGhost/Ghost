const path = require('path');
const jobsService = require('../../jobs');
const config = require('../../../../shared/config');

let hasScheduled = {
    processOutbox: false
};

module.exports = {
    async scheduleMemberWelcomeEmailJob() {
        const configValue = config.get('memberWelcomeEmailSendInstantly');
        const testEmailSendInstantly = configValue === true || configValue === 'true';
        const testInboxDisabled = !config.get('memberWelcomeEmailTestInbox');
        const alreadyScheduledProcessing = hasScheduled.processOutbox;

        if (testInboxDisabled || alreadyScheduledProcessing) {
            return false;
        }

        hasScheduled.processOutbox = true;
        const cronSchedule = testEmailSendInstantly ? '*/3 * * * * *' : '0 */5 * * * *';

        jobsService.addJob({
            at: cronSchedule,
            job: path.resolve(__dirname, 'process-outbox.js'),
            name: 'process-member-welcome-emails'
        });

        return hasScheduled.processOutbox;
    }
};
