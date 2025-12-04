const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const memberWelcomeEmailService = require('../../member-welcome-emails/service');

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload}) {
    // TODO: derive templateType from payload when paid welcome emails are added
    const templateType = 'free';
    await memberWelcomeEmailService.api.send({member: payload, templateType});
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
