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
        return {
            level: 'info',
            event: 'outbox.job.feature_disabled',
            message: 'Outbox processing skipped because welcome emails feature is disabled',
            log_key: OUTBOX_LOG_KEY
        };
    }

    memberWelcomeEmailService.init();
    try {
        await memberWelcomeEmailService.api.loadMemberWelcomeEmails();
    } catch (err) {
        const errorMessage = err?.message ?? 'Unknown error';
        logging.error({
            event: 'outbox.job.initialization_failed',
            message: 'Outbox processing aborted due to welcome email service initialization failure',
            log_key: OUTBOX_LOG_KEY,
            error_message: errorMessage,
            err
        });
        return {
            level: 'error',
            event: 'outbox.job.initialization_failed',
            message: 'Outbox processing aborted due to welcome email service initialization failure',
            log_key: OUTBOX_LOG_KEY,
            error_message: errorMessage
        };
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

        logging.info({
            event: 'outbox.job.batch_complete',
            message: 'Outbox processing batch completed',
            log_key: OUTBOX_LOG_KEY,
            batch_processed: processed,
            batch_failed: failed,
            batch_duration_ms: batchDurationMs,
            batch_rate_entries_per_sec: Number(batchRate)
        });
    }

    const durationMs = Date.now() - jobStartMs;

    if (totalProcessed + totalFailed === 0) {
        return {
            level: 'info',
            event: 'outbox.job.no_entries',
            message: MESSAGES.NO_ENTRIES,
            log_key: OUTBOX_LOG_KEY,
            total_processed: totalProcessed,
            total_failed: totalFailed,
            duration_ms: durationMs
        };
    }

    return {
        level: 'info',
        event: 'outbox.job.completed',
        message: 'Outbox processing completed',
        log_key: OUTBOX_LOG_KEY,
        total_processed: totalProcessed,
        total_failed: totalFailed,
        duration_ms: durationMs
    };
}

module.exports = processOutbox;
