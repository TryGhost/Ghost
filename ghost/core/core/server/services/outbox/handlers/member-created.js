const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const memberWelcomeEmailService = require('../../member-welcome-emails/service');
const {MemberAutomatedEmailEvent, AutomatedEmail} = require('../../../models');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../member-welcome-emails/constants');
const ObjectId = require('bson-objectid').default;

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload}) {
    await memberWelcomeEmailService.api.send({member: payload, memberStatus: payload.status});

    const slug = MEMBER_WELCOME_EMAIL_SLUGS[payload.status];
    const automatedEmail = await AutomatedEmail.findOne({slug});

    if (automatedEmail) {
        await MemberAutomatedEmailEvent.add({
            id: ObjectId().toHexString(),
            member_id: payload.memberId,
            automated_email_id: automatedEmail.id,
            created_at: new Date()
        });
    }
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
