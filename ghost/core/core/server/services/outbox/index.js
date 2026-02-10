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
            logging.info({
                event: 'outbox.job.already_running',
                message: 'Outbox job already running, skipping',
                log_key: OUTBOX_LOG_KEY
            });
            return;
        }
        this.processing = true;

        try {
            const status = await processOutbox();
            const logLevel = status?.level || 'info';
            const logMethod = logLevel === 'error' ? 'error' : (logLevel === 'warn' ? 'warn' : 'info');
            logging[logMethod](status);
        } catch (e) {
            logging.error({
                event: 'outbox.job.unhandled_error',
                message: 'Unhandled error while processing outbox',
                log_key: OUTBOX_LOG_KEY,
                err: e
            });
        } finally {
            this.processing = false;
        }
    }
}

module.exports = new OutboxServiceWrapper();
