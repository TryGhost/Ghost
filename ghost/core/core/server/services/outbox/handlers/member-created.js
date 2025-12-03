const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload, mailConfig}) {
    const sendMemberWelcomeEmail = require('../../member-welcome-emails').sendMemberWelcomeEmail;
    await sendMemberWelcomeEmail({payload, mailConfig});
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