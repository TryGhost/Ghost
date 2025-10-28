const {parentPort} = require('worker_threads');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const SIMULATE_FAILURE_RATE = 0.3;

function cancel() {
    if (parentPort) {
        parentPort.postMessage('Outbox processing cancelled');
        parentPort.postMessage('cancelled');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

if (parentPort) {
    parentPort.once('message', (message) => {
        if (message === 'cancel') {
            return cancel();
        }
    });
}

(async () => {
    const startTime = Date.now();
    const db = require('../../../data/db');

    if (process.env.NODE_ENV !== 'production') {
        logging.warn(`[WELCOME-EMAIL] Welcome email processor running in simulation mode (${SIMULATE_FAILURE_RATE * 100}% failure rate)`);
    }

    const entries = await db.knex('outbox')
        .where('event_type', 'MemberCreatedEvent')
        .where('retry_count', '<', MAX_RETRIES)
        .orderBy('created_at', 'asc')
        .limit(BATCH_SIZE)
        .select('*');

    let processed = 0;
    let failed = 0;

    for (const entry of entries) {
        let payload;
        try {
            payload = JSON.parse(entry.payload);

            if (Math.random() < SIMULATE_FAILURE_RATE) {
                throw new errors.InternalServerError({
                    message: 'Simulated random failure for testing retry logic'
                });
            }

            logging.info(`[WELCOME-EMAIL] Welcome email sent to ${payload.name} at ${payload.email}`);

            await db.knex('outbox')
                .where('id', entry.id)
                .delete();

            processed += 1;
        } catch (err) {
            await db.knex('outbox')
                .where('id', entry.id)
                .update({
                    retry_count: db.knex.raw('retry_count + 1'),
                    last_retry_at: db.knex.raw('CURRENT_TIMESTAMP')
                });

            failed += 1;
            const memberInfo = payload ? `${payload.name} (${payload.email})` : 'unknown member';
            logging.error(`[WELCOME-EMAIL] Failed to send to ${memberInfo}: ${err.message}`);
        }
    }

    const duration = Date.now() - startTime;
    const message = `Processed ${processed} outbox entries, ${failed} failed in ${duration}ms`;

    if (parentPort) {
        parentPort.postMessage(message);
        parentPort.postMessage('done');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();