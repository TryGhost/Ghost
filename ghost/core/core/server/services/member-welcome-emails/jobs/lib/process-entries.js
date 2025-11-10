const logging = require('@tryghost/logging');
const {MAX_RETRIES, MEMBER_WELCOME_EMAIL_LOG_KEY} = require('./constants');
const {OUTBOX_STATUSES} = require('../../../../models/outbox');
const sendMemberWelcomeEmail = require('./send-member-welcome-email');

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
* @param {Object} options - Update options
* @param {Object} options.db - Database connection
* @param {string} options.entryId - ID of the entry to update
* @param {number} options.retryCount - Current retry count
* @param {string} options.errorMessage - Error message to store
*/
async function updateFailedEntry({db, entryId, retryCount, errorMessage}) {
    const newRetryCount = retryCount + 1;
    const newStatus = newRetryCount <= MAX_RETRIES ? OUTBOX_STATUSES.PENDING : OUTBOX_STATUSES.FAILED;

    await db.knex('outbox')
        .where('id', entryId)
        .update({
            status: newStatus,
            retry_count: newRetryCount,
            last_retry_at: db.knex.raw('CURRENT_TIMESTAMP'),
            message: errorMessage.substring(0, 2000),
            updated_at: db.knex.raw('CURRENT_TIMESTAMP')
        });
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

        await sendMemberWelcomeEmail(payload);
        await deleteProcessedEntry(db, entry.id);

        return {success: true};
    } catch (err) {
        await updateFailedEntry({db, entryId: entry.id, retryCount: entry.retry_count, errorMessage: err.message});

        const email = payload?.email || 'unknown member';
        const memberInfo = payload?.name ? `${payload.name} (${email})` : email;
        logging.error(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Failed to send to ${memberInfo}: ${err.message}`);

        return {success: false};
    }
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

module.exports = processEntries;