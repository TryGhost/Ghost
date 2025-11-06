const BATCH_SIZE = 4;
const MAX_ENTRIES_PER_JOB = BATCH_SIZE * 4;
const MAX_RETRIES = 3;
const SIMULATE_FAILURE_RATE = 0.9;
const MEMBER_WELCOME_EMAIL_LOG_KEY = '[MEMBER-WELCOME-EMAIL]';

const MESSAGES = {
    CANCELLED: 'Outbox processing cancelled',
    NO_ENTRIES: 'No pending outbox entries to process',
    SIMULATION_MODE: `Member welcome email processor running in simulation mode (${SIMULATE_FAILURE_RATE * 100}% failure rate)`,
    SIMULATED_FAILURE: 'Simulated random failure for testing retry logic'
};

module.exports = {
    BATCH_SIZE,
    MAX_ENTRIES_PER_JOB,
    MAX_RETRIES,
    SIMULATE_FAILURE_RATE,
    MEMBER_WELCOME_EMAIL_LOG_KEY,
    MESSAGES
};
