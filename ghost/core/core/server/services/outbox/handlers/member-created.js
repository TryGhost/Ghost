const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const logging = require('@tryghost/logging');

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload}) {
    // Welcome email sending is now handled by the campaign system (step 0).
    // The campaign-enrollment outbox handler triggers processEnrollment which
    // sends step 0 and tracks it in automated_email_recipients.
    logging.info(`${LOG_KEY} Member created: ${payload.email} (status: ${payload.status}) — welcome email delegated to campaign system`);
}

function getLogInfo(payload) {
    const email = payload?.email || 'unknown member';
    return payload?.name ? `${payload.name} (${email})` : email;
}

module.exports = {
    handle,
    getLogInfo,
    LOG_KEY
};
