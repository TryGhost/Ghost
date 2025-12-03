const logging = require('@tryghost/logging');
const jobs = require('./jobs');
const StartMemberWelcomeEmailJobEvent = require('./events/StartMemberWelcomeEmailJobEvent');
const domainEvents = require('@tryghost/domain-events');
const processOutbox = require('./jobs/lib/process-outbox');
const {MemberCreatedEvent} = require('../../../shared/events');
const config = require('../../../shared/config');
const {WELCOME_EMAIL_SOURCES} = require('./jobs/lib/constants');

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

        domainEvents.subscribe(MemberCreatedEvent, async (event) => {
            if (config.get('memberWelcomeEmailTestInbox') && WELCOME_EMAIL_SOURCES.includes(event.data.source)) {
                await this.startProcessing();
            }
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
            const statusMessage = await processOutbox();
            logging.info(statusMessage);
        } catch (e) {
            logging.error(e, 'Error while processing member welcome emails');
        } finally {
            this.processing = false;
        }
    }
}

module.exports = new MemberWelcomeEmailsServiceWrapper();