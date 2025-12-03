const logging = require('@tryghost/logging');
const jobs = require('./jobs');
const StartOutboxProcessingEvent = require('./events/StartOutboxProcessingEvent');
const domainEvents = require('@tryghost/domain-events');
const processOutbox = require('./jobs/lib/process-outbox');
const {MemberCreatedEvent} = require('../../../shared/events');
const config = require('../../../shared/config');
const {WELCOME_EMAIL_SOURCES} = require('./jobs/lib/constants');

class OutboxServiceWrapper {
    init() {
        if (this.initialized) {
            return;
        }

        this.processing = false;

        jobs.scheduleOutboxJob();

        domainEvents.subscribe(StartOutboxProcessingEvent, async () => {
            await this.startProcessing();
        });

        domainEvents.subscribe(MemberCreatedEvent, async (event) => {
            if (!config.get('memberWelcomeEmailTestInbox')) {
                return;
            }

            if (!WELCOME_EMAIL_SOURCES.includes(event.data.source)) {
                logging.info('member created but from api so skipping');
                return;
            }

            await this.startProcessing();
        });

        this.initialized = true;
    }

    async startProcessing() {
        if (this.processing) {
            logging.info('Outbox job already running, skipping');
            return;
        }
        this.processing = true;

        try {
            const statusMessage = await processOutbox();
            logging.info(statusMessage);
        } catch (e) {
            logging.error(e, 'Error while processing outbox');
        } finally {
            this.processing = false;
        }
    }
}

module.exports = new OutboxServiceWrapper();

