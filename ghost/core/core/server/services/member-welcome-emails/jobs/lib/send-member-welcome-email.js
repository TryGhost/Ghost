const logging = require('@tryghost/logging');
const {MEMBER_WELCOME_EMAIL_LOG_KEY} = require('./constants');

/**
 * Sends a welcome email to a new member (currently logs only)
 * @param {Object} payload - Member data containing name and email
 */
async function sendMemberWelcomeEmail(payload) {
    const name = payload?.name ? `${payload.name} at ` : '';
    logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Welcome email mock sent to ${name}${payload?.email}`);
}

module.exports = sendMemberWelcomeEmail;
