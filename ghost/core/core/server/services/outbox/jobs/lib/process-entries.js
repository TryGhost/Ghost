const logging = require('@tryghost/logging');
const {MAX_RETRIES, OUTBOX_LOG_KEY} = require('./constants');
const {OUTBOX_STATUSES} = require('../../../../models/outbox');
const MemberCreatedEvent = require('../../../../../shared/events/member-created-event');
const memberCreatedHandler = require('../../handlers/member-created');

const EVENT_HANDLERS = {
    [MemberCreatedEvent.name]: memberCreatedHandler
};

async function deleteProcessedEntry({db, entryId}) {
    await db.knex('outbox')
        .where('id', entryId)
        .delete();
}

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

async function markEntryCompleted({db, entryId}) {
    await db.knex('outbox')
        .where('id', entryId)
        .update({
            status: OUTBOX_STATUSES.COMPLETED,
            message: 'Processed, but failed to delete outbox entry',
            updated_at: db.knex.raw('CURRENT_TIMESTAMP')
        });
}

async function processEntry({db, entry}) {
    const handler = EVENT_HANDLERS[entry.event_type];
    if (!handler) {
        logging.warn({
            system: {
                event: 'outbox.entry.no_handler',
                event_type: entry.event_type
            }
        }, `${OUTBOX_LOG_KEY} No handler for event type: ${entry.event_type}`);
        await updateFailedEntry({db, entryId: entry.id, retryCount: entry.retry_count, errorMessage: `No handler for event type: ${entry.event_type}`});
        return {success: false};
    }

    let payload;
    try {
        payload = JSON.parse(entry.payload);
        await handler.handle({payload});
    } catch (err) {
        const errorMessage = err?.message ?? 'Unknown error';
        await updateFailedEntry({db, entryId: entry.id, retryCount: entry.retry_count, errorMessage});

        if (!payload) {
            logging.error({
                system: {
                    event: 'outbox.entry.payload_parse_failed',
                    entry_id: entry.id
                },
                err
            }, `${handler.LOG_KEY} Failed to parse payload for entry ${entry.id}.`);
        } else {
            logging.error({
                system: {
                    event: 'outbox.entry.send_failed',
                    entry_id: entry.id
                },
                err
            }, `${handler.LOG_KEY} Failed to send to ${handler.getLogInfo(payload)}.`);
        }

        return {success: false};
    }

    try {
        await deleteProcessedEntry({db, entryId: entry.id});
    } catch (err) {
        await markEntryCompleted({db, entryId: entry.id});
        logging.error({
            system: {
                event: 'outbox.entry.delete_failed',
                entry_id: entry.id
            },
            err
        }, `${handler.LOG_KEY} Sent to ${handler.getLogInfo(payload)} but failed to delete outbox entry ${entry.id}.`);
    }

    return {success: true};
}

async function processEntries({db, entries}) {
    let processed = 0;
    let failed = 0;

    for (const entry of entries) {
        const result = await processEntry({db, entry});
        if (result.success) {
            processed += 1;
        } else {
            failed += 1;
        }
    }

    return {processed, failed};
}

module.exports = processEntries;
