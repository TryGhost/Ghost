const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const memberWelcomeEmailService = require('../../member-welcome-emails/service');
const {AutomatedEmailRecipient, AutomatedEmail, Member} = require('../../../models');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../member-welcome-emails/constants');
const ObjectId = require('bson-objectid').default;

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload}) {
    await memberWelcomeEmailService.api.send({member: payload, memberStatus: payload.status});

    const slug = MEMBER_WELCOME_EMAIL_SLUGS[payload.status];
    const automatedEmail = await AutomatedEmail.findOne({slug});
    const member = await Member.findOne({id: payload.id});

    if (automatedEmail && member) {
        await AutomatedEmailRecipient.add({
            id: ObjectId().toHexString(),
            automated_email_id: automatedEmail.id,
            member_id: member.id,
            processed_at: new Date(),
            member_uuid: member.get('uuid'),
            member_email: member.get('email'),
            member_name: member.get('name')
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
