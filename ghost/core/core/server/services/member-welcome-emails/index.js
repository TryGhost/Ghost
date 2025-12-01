const logging = require('@tryghost/logging');
const jobs = require('./jobs');
const StartMemberWelcomeEmailJobEvent = require('./events/StartMemberWelcomeEmailJobEvent');
const domainEvents = require('@tryghost/domain-events');
const processOutbox = require('./jobs/lib/process-outbox');

class MemberWelcomeEmailsServiceWrapper {
    init() {
        if (this.initialized) {
            return;
        }

        this.processing = false;

        jobs.scheduleMemberWelcomeEmailJob();

        domainEvents.subscribe(StartMemberWelcomeEmailJobEvent, async () => {
            await this.startProcessing();
        });

        this.initialized = true;
    }

    async startProcessing() {
        if (this.processing) {
            logging.info('Member welcome email job already running, skipping');
            return;
        }
        this.processing = true;

        try {
            await processOutbox();
        } catch (e) {
            logging.error(e, 'Error while processing member welcome emails');
        } finally {
            this.processing = false;
        }
    }
}

module.exports = new MemberWelcomeEmailsServiceWrapper();