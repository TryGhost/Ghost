const BATCH_SIZE = 100;
const MAX_ENTRIES_PER_JOB = BATCH_SIZE * 10;
const MAX_RETRIES = 1;
const OUTBOX_LOG_KEY = '[OUTBOX]';

const MESSAGES = {
    CANCELLED: 'Outbox processing cancelled',
    NO_ENTRIES: 'No pending outbox entries to process'
};

module.exports = {
    BATCH_SIZE,
    MAX_ENTRIES_PER_JOB,
    MAX_RETRIES,
    OUTBOX_LOG_KEY,
    MESSAGES
};