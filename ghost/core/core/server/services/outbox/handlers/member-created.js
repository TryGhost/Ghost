const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const memberWelcomeEmailService = require('../../member-welcome-emails/service');
const logging = require('@tryghost/logging');
const {AutomatedEmail, AutomatedEmailRecipient} = require('../../../models');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../member-welcome-emails/constants');

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload}) {
    await memberWelcomeEmailService.api.send({member: payload, memberStatus: payload.status});

    try {
        const slug = MEMBER_WELCOME_EMAIL_SLUGS[payload.status];
        if (!slug) {
            logging.warn(`No automated email slug found for member status: ${payload.status}`);
            return;
        }

        const automatedEmail = await AutomatedEmail.findOne({slug});
        if (!automatedEmail) {
            logging.warn(`No automated email found for slug: ${slug}`);
            return;
        }

        await AutomatedEmailRecipient.add({
            member_id: payload.memberId,
            automated_email_id: automatedEmail.id,
            processed_at: new Date()
        });
    } catch (err) {
        logging.error({
            message: 'Failed to track automated email send',
            err
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
