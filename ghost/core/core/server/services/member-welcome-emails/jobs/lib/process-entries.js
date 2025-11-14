const logging = require('@tryghost/logging');
const {MAX_RETRIES, MEMBER_WELCOME_EMAIL_LOG_KEY} = require('./constants');
const {OUTBOX_STATUSES} = require('../../../../models/outbox');
const sendMemberWelcomeEmail = require('./send-member-welcome-email');

/**
 * Deletes a successfully processed outbox entry
 * @param {Object} options
 * @param {Object} options.db - Database connection
 * @param {string} options.entryId - ID of the entry to delete
 */
async function deleteProcessedEntry({db, entryId}) {
    await db.knex('outbox')
        .where('id', entryId)
        .delete();
}

/**
* Updates a failed entry with incremented retry count and new status
* @param {Object} options - Update options
* @param {Object} options.db - Database connection
* @param {string} options.entryId - ID of the entry to update
* @param {number} options.retryCount - Current retry count
* @param {string} options.errorMessage - Error message to store
*/
async function updateFailedEntry({db, entryId, retryCount, errorMessage}) {
    const newRetryCount = retryCount + 1;
    const newStatus = newRetryCount <= MAX_RETRIES ? OUTBOX_STATUSES.PENDING : OUTBOX_STATUSES.FAILED;

    const truncatedMessage = (errorMessage ?? 'Unknown error').toString().slice(0, 2000);

    await db.knex('outbox')
        .where('id', entryId)
        .update({
            status: newStatus,
            retry_count: newRetryCount,
            last_retry_at: db.knex.raw('CURRENT_TIMESTAMP'),
            message: truncatedMessage,
            updated_at: db.knex.raw('CURRENT_TIMESTAMP')
        });
}

/**
 * Marks an outbox entry as completed when cleanup fails after sending
 * @param {Object} options
 * @param {Object} options.db - Database connection
 * @param {string} options.entryId - ID of the entry to update
 */
async function markEntryCompleted({db, entryId}) {
    await db.knex('outbox')
        .where('id', entryId)
        .update({
            status: OUTBOX_STATUSES.COMPLETED,
            message: 'Email sent, but failed to delete outbox entry',
            updated_at: db.knex.raw('CURRENT_TIMESTAMP')
        });
}

/**
* Processes a single outbox entry by sending welcome email and managing retry logic
* @param {Object} options
* @param {Object} options.db - Database connection
* @param {Object} options.entry - Outbox entry to process
* @param {import('./get-mail-config').MailConfig} options.mailConfig - Mail configuration
* @returns {Promise<Object>} Result object with success boolean
*/
async function processEntry({db, entry, mailConfig}) {
    let payload;

    try {
        payload = JSON.parse(entry.payload);
        await sendMemberWelcomeEmail({payload, mailConfig});
    } catch (err) {
        const errorMessage = err?.message ?? 'Unknown error';
        await updateFailedEntry({db, entryId: entry.id, retryCount: entry.retry_count, errorMessage});

        if (!payload) {
            logging.error(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Failed to parse payload for entry ${entry.id}: ${errorMessage}`);
        } else {
            const email = payload?.email || 'unknown member';
            const memberInfo = payload?.name ? `${payload.name} (${email})` : email;
            logging.error(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Failed to send to ${memberInfo}: ${errorMessage}`);
        }

        return {success: false};
    }

    try {
        await deleteProcessedEntry({db, entryId: entry.id});
    } catch (err) {
        const cleanupError = err?.message ?? 'Unknown error';
        await markEntryCompleted({db, entryId: entry.id});

        const email = payload?.email || 'unknown member';
        const memberInfo = payload?.name ? `${payload.name} (${email})` : email;
        logging.error(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Sent to ${memberInfo} but failed to delete outbox entry ${entry.id}: ${cleanupError}`);
    }

    return {success: true};
}

/**
* Processes all entries in a batch sequentially
* @param {Object} options
* @param {Object} options.db - Database connection
* @param {Array} options.entries - Array of outbox entries to process
* @param {import('./get-mail-config').MailConfig} options.mailConfig - Mail configuration
* @returns {Promise<Object>} Object with processed and failed counts
*/
async function processEntries({db, entries, mailConfig}) {
    let processed = 0;
    let failed = 0;

    for (const entry of entries) {
        const result = await processEntry({db, entry, mailConfig});
        if (result.success) {
            processed += 1;
        } else {
            failed += 1;
        }
    }

    return {processed, failed};
}

module.exports = processEntries;
