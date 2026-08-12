const {Job} = require('../../jobs/v2');

/**
 * Recurring cleanup of expired single-use (magic link) tokens. Carries no
 * payload — the job is pure schedule. The handler is registered centrally
 * in services/jobs/v2/register-handlers.js.
 */
class CleanTokensJob extends Job {
    static type = 'clean-tokens';
}

module.exports = CleanTokensJob;
