const logging = require('@tryghost/logging');
const jobs = require('./jobs');
const StartOutboxProcessingEvent = require('./events/start-outbox-processing-event');
const domainEvents = require('@tryghost/domain-events');
const processOutbox = require('./jobs/lib/process-outbox');
const {OUTBOX_LOG_KEY} = require('./jobs/lib/constants');

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

        this.initialized = true;
    }

    async startProcessing() {
        if (this.processing) {
            logging.info(`${OUTBOX_LOG_KEY}: Outbox job already running, skipping`);
            return;
        }
        this.processing = true;

        try {
            const statusMessage = await processOutbox();
            logging.info(statusMessage);
        } catch (e) {
            logging.error(e, `${OUTBOX_LOG_KEY}: Error while processing outbox`);
        } finally {
            this.processing = false;
        }
    }
}

module.exports = new OutboxServiceWrapper();
