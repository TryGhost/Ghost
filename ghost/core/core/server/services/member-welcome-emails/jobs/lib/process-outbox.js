const logging = require('@tryghost/logging');
const MemberCreatedEvent = require('../../../../../shared/events/MemberCreatedEvent');
const {OUTBOX_STATUSES} = require('../../../../models/outbox');
const {MESSAGES, MAX_ENTRIES_PER_JOB, BATCH_SIZE, MEMBER_WELCOME_EMAIL_LOG_KEY} = require('./constants');
const processEntries = require('./process-entries');
const getMailConfig = require('./get-mail-config');

/**
 * Fetches pending outbox entries and sets them to processing
 * @param {Object} options
 * @param {Object} options.db - Database connection
 * @param {number} options.batchSize - Maximum number of entries to fetch
 * @param {string} options.jobStartISO - ISO-formatted timestamp when the job started (YYYY-MM-DD HH:mm:ss)
 * @returns {Promise<Array>} Array of outbox entries marked as PROCESSING
 */
async function fetchPendingEntries({db, batchSize, jobStartISO}) {
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
 * Processes pending outbox entries for member welcome emails
 * @returns {Promise<string>} Completion message with processing statistics
 */
async function processOutbox() {
    const db = require('../../../../data/db');

    const jobStartMs = Date.now();
    const jobStartISO = new Date(jobStartMs).toISOString().slice(0, 19).replace('T', ' ');

    let mailConfig;
    try {
        mailConfig = await getMailConfig({db});
    } catch (err) {
        const errorMessage = err?.message ?? 'Unknown error';
        logging.error(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Mail initialization failed: ${errorMessage}`);
        return `${MEMBER_WELCOME_EMAIL_LOG_KEY} Job aborted: Mail initialization failed`;
    }

    let totalProcessed = 0;
    let totalFailed = 0;

    while (totalProcessed + totalFailed < MAX_ENTRIES_PER_JOB) {
        const remainingCapacity = MAX_ENTRIES_PER_JOB - (totalProcessed + totalFailed);
        const fetchSize = Math.min(BATCH_SIZE, remainingCapacity);

        const entries = await fetchPendingEntries({db, batchSize: fetchSize, jobStartISO});
        if (entries.length === 0) {
            break;
        }

        const batchStartMs = Date.now();
        const {processed, failed} = await processEntries({db, entries, mailConfig});
        const batchDurationMs = Date.now() - batchStartMs;
        const batchRate = ((processed + failed) / (Math.max(batchDurationMs, 1) / 1000)).toFixed(1);

        totalProcessed += processed;
        totalFailed += failed;

        logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Batch complete: ${processed} processed, ${failed} failed in ${(batchDurationMs / 1000).toFixed(2)}s (${batchRate} entries/sec)`);
    }

    const durationMs = Date.now() - jobStartMs;

    if (totalProcessed + totalFailed === 0) {
        return `${MEMBER_WELCOME_EMAIL_LOG_KEY} ${MESSAGES.NO_ENTRIES}`;
    }

    return `${MEMBER_WELCOME_EMAIL_LOG_KEY} Job complete: Processed ${totalProcessed} outbox entries, ${totalFailed} failed in ${(durationMs / 1000).toFixed(2)}s`;
}

module.exports = processOutbox;