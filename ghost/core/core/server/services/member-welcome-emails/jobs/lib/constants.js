const BATCH_SIZE = 100;
const MAX_ENTRIES_PER_JOB = BATCH_SIZE * 10;
const MAX_RETRIES = 0; // no retries currently, allows monitoring of failure frequency
const MEMBER_WELCOME_EMAIL_LOG_KEY = '[MEMBER-WELCOME-EMAIL]';

const MESSAGES = {
    CANCELLED: 'Outbox processing cancelled',
    NO_ENTRIES: 'No pending outbox entries to process'
};

module.exports = {
    BATCH_SIZE,
    MAX_ENTRIES_PER_JOB,
    MAX_RETRIES,
    MEMBER_WELCOME_EMAIL_LOG_KEY,
    MESSAGES
};
