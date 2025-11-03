const {parentPort} = require('worker_threads');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const MemberCreatedEvent = require('../../../../shared/events/MemberCreatedEvent');
const {OUTBOX_STATUSES} = require('../../../models/outbox');

const BATCH_SIZE = 100;
const MAX_ENTRIES_PER_JOB = 1000;
const MAX_RETRIES = 3;
const SIMULATE_FAILURE_RATE = 0.3;

const EXPONENTIAL_BACKOFF = {
    enabled: false,
    baseDelayMs: 30000
};

const MESSAGES = {
    CANCELLED: 'Outbox processing cancelled',
    NO_ENTRIES: 'No pending outbox entries to process',
    SIMULATION_MODE: `Welcome email processor running in simulation mode (${SIMULATE_FAILURE_RATE * 100}% failure rate)`,
    SIMULATED_FAILURE: 'Simulated random failure for testing retry logic'
};

/**
 * Sends a status message to the parent worker thread
 * @param {string} message - Status message to send
 */
function sendMessage(message) {
    if (parentPort) {
        parentPort.postMessage(message);
    }
}

/**
 * Completes the job and exits the worker
 * @param {string} message - Final completion message
 */
function completeJob(message) {
    sendMessage(message);
    if (parentPort) {
        parentPort.postMessage('done');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

/**
 * Cancels the job and exits the worker
 */
function cancel() {
    sendMessage(MESSAGES.CANCELLED);
    if (parentPort) {
        parentPort.postMessage('cancelled');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

/**
 * Fetches pending outbox entries with exponential backoff and locks them for processing
 * @param {Object} db - Database connection
 * @param {number} batchSize - Maximum number of entries to fetch
 * @returns {Promise<Array>} Array of outbox entries marked as SUBMITTING
 */
async function fetchPendingEntries(db, batchSize) {
    let entries = [];
    await db.knex.transaction(async (trx) => {
        const query = trx('outbox')
            .where('event_type', MemberCreatedEvent.name)
            .where('status', OUTBOX_STATUSES.PENDING);
        
        if (EXPONENTIAL_BACKOFF.enabled) {
            query.andWhere(function () {
                this.whereNull('last_retry_at')
                    .orWhereRaw('last_retry_at < DATE_SUB(NOW(), INTERVAL ? SECOND)', [
                        Math.floor(EXPONENTIAL_BACKOFF.baseDelayMs / 1000)
                    ])
                    .orWhereRaw('last_retry_at < DATE_SUB(NOW(), INTERVAL (? * POW(2, retry_count)) SECOND)', [
                        Math.floor(EXPONENTIAL_BACKOFF.baseDelayMs / 1000)
                    ]);
            });
        }
        
        entries = await query
            .orderBy('created_at', 'asc')
            .limit(batchSize)
            .forUpdate()
            .select('*');
        
        if (entries.length > 0) {
            const ids = entries.map(e => e.id);
            await trx('outbox')
                .whereIn('id', ids)
                .update({status: OUTBOX_STATUSES.SUBMITTING});
        }
    });
    
    return entries;
}

/**
 * Deletes a successfully processed outbox entry
 * @param {Object} db - Database connection
 * @param {string} entryId - ID of the entry to delete
 */
async function deleteProcessedEntry(db, entryId) {
    await db.knex('outbox')
        .where('id', entryId)
        .delete();
}

/**
 * Updates a failed entry with incremented retry count and new status
 * @param {Object} db - Database connection
 * @param {string} entryId - ID of the entry to update
 * @param {number} retryCount - Current retry count
 */
async function updateFailedEntry(db, entryId, retryCount) {
    const newRetryCount = retryCount + 1;
    const newStatus = newRetryCount >= MAX_RETRIES ? OUTBOX_STATUSES.FAILED : OUTBOX_STATUSES.PENDING;

    await db.knex('outbox')
        .where('id', entryId)
        .update({
            status: newStatus,
            retry_count: newRetryCount,
            last_retry_at: db.knex.raw('CURRENT_TIMESTAMP')
        });
}

/**
 * Determines whether to simulate a failure for testing retry logic
 * @returns {boolean} True if failure should be simulated (non-production only)
 */
function shouldSimulateFailure() {
    return process.env.NODE_ENV !== 'production' && Math.random() < SIMULATE_FAILURE_RATE;
}

/**
 * Sends a welcome email to a new member (currently logs only)
 * @param {Object} payload - Member data containing name and email
 */
async function sendWelcomeEmail(payload) {
    logging.info(`[WELCOME-EMAIL] Welcome email sent to ${payload.name} at ${payload.email}`);
}

/**
 * Processes a single outbox entry by sending welcome email and managing retry logic
 * @param {Object} db - Database connection
 * @param {Object} entry - Outbox entry to process
 * @returns {Promise<Object>} Result object with success boolean
 */
async function processEntry(db, entry) {
    let payload;
    try {
        payload = JSON.parse(entry.payload);

        if (shouldSimulateFailure()) {
            throw new errors.InternalServerError({
                message: MESSAGES.SIMULATED_FAILURE
            });
        }

        await sendWelcomeEmail(payload);
        await deleteProcessedEntry(db, entry.id);

        return {success: true};
    } catch (err) {
        await updateFailedEntry(db, entry.id, entry.retry_count);

        const memberInfo = payload ? `${payload.name} (${payload.email})` : 'unknown member';
        logging.error(`[WELCOME-EMAIL] Failed to send to ${memberInfo}: ${err.message}`);

        return {success: false};
    }
}

if (parentPort) {
    parentPort.once('message', (message) => {
        if (message === 'cancel') {
            return cancel();
        }
    });
}

/**
 * Formats the job completion message with stats
 * @param {number} processed - Number of successfully processed entries
 * @param {number} failed - Number of failed entries
 * @param {number} durationMs - Total processing time in milliseconds
 * @returns {string} Formatted completion message
 */
function formatCompletionMessage(processed, failed, durationMs) {
    return `Processed ${processed} outbox entries, ${failed} failed in ${(durationMs / 1000).toFixed(2)}s`;
}

/**
 * Processes all entries in a batch sequentially
 * @param {Object} db - Database connection
 * @param {Array} entries - Array of outbox entries to process
 * @returns {Promise<Object>} Object with processed and failed counts
 */
async function processEntries(db, entries) {
    let processed = 0;
    let failed = 0;

    for (const entry of entries) {
        const result = await processEntry(db, entry);
        if (result.success) {
            processed += 1;
        } else {
            failed += 1;
        }
    }

    return {processed, failed};
}

(async () => {
    const startTime = Date.now();
    const db = require('../../../data/db');

    if (process.env.NODE_ENV !== 'production') {
        logging.info(MESSAGES.SIMULATION_MODE);
    }

    let totalProcessed = 0;
    let totalFailed = 0;
    let entries = await fetchPendingEntries(db, BATCH_SIZE);

    while (entries.length > 0 && totalProcessed + totalFailed < MAX_ENTRIES_PER_JOB) {
        const batchStartMs = Date.now();
        const {processed, failed} = await processEntries(db, entries);
        const batchDurationMs = Date.now() - batchStartMs;
        const batchRate = ((processed + failed) / (batchDurationMs / 1000)).toFixed(1);
        
        totalProcessed += processed;
        totalFailed += failed;

        logging.info(`[WELCOME-EMAIL] Batch complete: ${processed} processed, ${failed} failed in ${(batchDurationMs / 1000).toFixed(2)}s (${batchRate} entries/sec)`);

        entries = await fetchPendingEntries(db, BATCH_SIZE);
    }

    const durationMs = Date.now() - startTime;

    if (totalProcessed + totalFailed === 0) {
        return completeJob(MESSAGES.NO_ENTRIES);
    }

    completeJob(formatCompletionMessage(totalProcessed, totalFailed, durationMs));
})();
