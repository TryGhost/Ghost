const logging = require('@tryghost/logging');
const jobs = require('./jobs');
const StartOutboxProcessingEvent = require('./events/start-outbox-processing-event');
const domainEvents = require('@tryghost/domain-events');
const processOutbox = require('./jobs/lib/process-outbox');
const {OUTBOX_LOG_KEY} = require('./jobs/lib/constants');

class OutboxServiceWrapper {
    constructor({jobs: jobsDep = jobs, processOutbox: processOutboxDep = processOutbox} = {}) {
        this.jobs = jobsDep;
        this.processOutbox = processOutboxDep;
    }

    init() {
        if (this.initialized) {
            return;
        }

        this.processing = false;
        this.jobs.scheduleOutboxJob();
        domainEvents.subscribe(StartOutboxProcessingEvent, async () => {
            await this.startProcessing();
        });
        this.initialized = true;
    }

    async startProcessing() {
        if (this.processing) {
            logging.info({system: {event: 'outbox.processing.skipped_already_running'}}, `${OUTBOX_LOG_KEY}: Outbox job already running, skipping`);
            return;
        }
        this.processing = true;
        try {
            const statusMessage = await this.processOutbox();
            logging.info(statusMessage);
        } catch (err) {
            logging.error({system: {event: 'outbox.processing.error'}, err}, `${OUTBOX_LOG_KEY}: Error while processing outbox`);
        } finally {
            this.processing = false;
        }
    }
}

function createOutboxService(deps) {
    return new OutboxServiceWrapper(deps);
}

module.exports = createOutboxService();
module.exports.createOutboxService = createOutboxService;
