const logging = require('@tryghost/logging');
const db = require('../../../../data/db');
const labs = require('../../../../../shared/labs');
const MemberCreatedEvent = require('../../../../../shared/events/member-created-event');
const {OUTBOX_STATUSES} = require('../../../../models/outbox');
const {MESSAGES, MAX_ENTRIES_PER_JOB, BATCH_SIZE, OUTBOX_LOG_KEY} = require('./constants');
const processEntries = require('./process-entries');
const memberWelcomeEmailService = require('../../../member-welcome-emails/service');

async function fetchPendingEntries({batchSize, jobStartISO}) {
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

async function processOutbox() {
    const jobStartMs = Date.now();
    const jobStartISO = new Date(jobStartMs).toISOString().slice(0, 19).replace('T', ' ');

    if (!labs.isSet('welcomeEmails')) {
        return `${OUTBOX_LOG_KEY} Welcome emails feature is disabled`;
    }

    memberWelcomeEmailService.init();
    try {
        await memberWelcomeEmailService.api.loadMemberWelcomeEmails();
    } catch (err) {
        const errorMessage = err?.message ?? 'Unknown error';
        logging.error(`${OUTBOX_LOG_KEY} Service initialization failed: ${errorMessage}`);
        return `${OUTBOX_LOG_KEY} Job aborted: Service initialization failed`;
    }

    let totalProcessed = 0;
    let totalFailed = 0;

    while (totalProcessed + totalFailed < MAX_ENTRIES_PER_JOB) {
        const remainingCapacity = MAX_ENTRIES_PER_JOB - (totalProcessed + totalFailed);
        const fetchSize = Math.min(BATCH_SIZE, remainingCapacity);

        const entries = await fetchPendingEntries({batchSize: fetchSize, jobStartISO});
        if (entries.length === 0) {
            break;
        }

        const batchStartMs = Date.now();
        const {processed, failed} = await processEntries({db, entries});
        const batchDurationMs = Date.now() - batchStartMs;
        const batchRate = ((processed + failed) / (Math.max(batchDurationMs, 1) / 1000)).toFixed(1);

        totalProcessed += processed;
        totalFailed += failed;

        logging.info(`${OUTBOX_LOG_KEY} Batch complete: ${processed} processed, ${failed} failed in ${(batchDurationMs / 1000).toFixed(2)}s (${batchRate} entries/sec)`);
    }

    const durationMs = Date.now() - jobStartMs;

    if (totalProcessed + totalFailed === 0) {
        return `${OUTBOX_LOG_KEY} ${MESSAGES.NO_ENTRIES}`;
    }

    return `${OUTBOX_LOG_KEY} Job complete: Processed ${totalProcessed} outbox entries, ${totalFailed} failed in ${(durationMs / 1000).toFixed(2)}s`;
}

module.exports = processOutbox;
