const {parentPort} = require('worker_threads');
const logging = require('@tryghost/logging');
const MemberCreatedEvent = require('../../../../shared/events/MemberCreatedEvent');
const {OUTBOX_STATUSES} = require('../../../models/outbox');
const {MESSAGES, MAX_ENTRIES_PER_JOB, BATCH_SIZE, MEMBER_WELCOME_EMAIL_LOG_KEY} = require('./lib/constants');
const processEntries = require('./lib/process-entries');

/**
 * Fetches pending outbox entries and sets them to processing
 * @param {Object} db - Database connection
 * @param {number} batchSize - Maximum number of entries to fetch
 * @param {string} jobStartISO - ISO-formatted timestamp when the job started (YYYY-MM-DD HH:mm:ss)
 * @returns {Promise<Array>} Array of outbox entries marked as PROCESSING
 */
async function fetchPendingEntries(db, batchSize, jobStartISO) {
    let entries = [];
    await db.knex.transaction(async (trx) => {
        const query = trx('outbox')
            .where('event_type', MemberCreatedEvent.name)
            .where('status', OUTBOX_STATUSES.PENDING)
            .where(function () {
                this.whereNull('last_retry_at')
                    .orWhere('last_retry_at', '<', jobStartISO);
            });
        
        entries = await query
            .orderBy('created_at', 'asc')
            .limit(batchSize)
            .forUpdate()
            .select('*');
        
        if (entries.length > 0) {
            const ids = entries.map(e => e.id);
            await trx('outbox')
                .whereIn('id', ids)
                .update({
                    status: OUTBOX_STATUSES.PROCESSING,
                    updated_at: db.knex.raw('CURRENT_TIMESTAMP')
                });
        }
    });
    
    return entries;
}

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

if (parentPort) {
    parentPort.once('message', (message) => {
        if (message === 'cancel') {
            return cancel();
        }
    });
}

async function processOutbox() {
    const db = require('../../../data/db');
    
    const jobStartMs = Date.now();
    const jobStartISO = new Date(jobStartMs).toISOString().slice(0, 19).replace('T', ' ');

    let totalProcessed = 0;
    let totalFailed = 0;

    while (totalProcessed + totalFailed < MAX_ENTRIES_PER_JOB) {
        const remainingCapacity = MAX_ENTRIES_PER_JOB - (totalProcessed + totalFailed);
        const fetchSize = Math.min(BATCH_SIZE, remainingCapacity);
        
        const entries = await fetchPendingEntries(db, fetchSize, jobStartISO);
        if (entries.length === 0) {
            break;
        }

        const batchStartMs = Date.now();
        const {processed, failed} = await processEntries(db, entries);
        const batchDurationMs = Date.now() - batchStartMs;
        const batchRate = ((processed + failed) / (batchDurationMs / 1000)).toFixed(1);
        
        totalProcessed += processed;
        totalFailed += failed;

        logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Batch complete: ${processed} processed, ${failed} failed in ${(batchDurationMs / 1000).toFixed(2)}s (${batchRate} entries/sec)`);
    }

    const durationMs = Date.now() - jobStartMs;

    if (totalProcessed + totalFailed === 0) {
        return completeJob(MESSAGES.NO_ENTRIES);
    }

    completeJob(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Job complete: Processed ${totalProcessed} outbox entries, ${totalFailed} failed in ${(durationMs / 1000).toFixed(2)}s`);
}

processOutbox();