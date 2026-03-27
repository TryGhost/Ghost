/**
 * Builds a Stripe CLI command string with the correct flags for the current environment.
 * Used by both globalSetup (--print-secret) and the per-worker webhook forwarder.
 *
 * @param {...string} args - Stripe CLI subcommand and flags (e.g. 'listen', '--print-secret')
 * @returns {string} The full command string
 */
function buildStripeCommand(...args) {
    const parts = ['stripe', ...args];

    const needsApiKey = process.env.CI || process.env.GHOST_DEV_IS_DOCKER === 'true';
    if (needsApiKey && process.env.STRIPE_SECRET_KEY) {
        parts.push('--api-key', process.env.STRIPE_SECRET_KEY);
    }

    return parts.join(' ');
}

module.exports = {buildStripeCommand};
