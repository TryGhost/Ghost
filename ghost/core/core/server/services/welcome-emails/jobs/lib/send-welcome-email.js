const logging = require('@tryghost/logging');

/**
 * Sends a welcome email to a new member (currently logs only)
 * @param {Object} payload - Member data containing name and email
 */
async function sendWelcomeEmail(payload) {
    logging.info(`[WELCOME-EMAIL] Welcome email sent to ${payload.name} at ${payload.email}`);
}

module.exports = sendWelcomeEmail;
