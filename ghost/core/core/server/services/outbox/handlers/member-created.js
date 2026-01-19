const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const memberWelcomeEmailService = require('../../member-welcome-emails/service');
const {AutomatedEmailRecipient, AutomatedEmail} = require('../../../models');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../member-welcome-emails/constants');
const ObjectId = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload}) {
    await memberWelcomeEmailService.api.send({member: payload, memberStatus: payload.status});

    // Track the welcome email send for the activity feed
    // This is non-critical - failures shouldn't affect the welcome email delivery
    try {
        const slug = MEMBER_WELCOME_EMAIL_SLUGS[payload.status];
        const automatedEmail = await AutomatedEmail.findOne({slug});

        if (automatedEmail) {
            await AutomatedEmailRecipient.add({
                id: ObjectId().toHexString(),
                automated_email_id: automatedEmail.id,
                member_id: payload.id,
                processed_at: new Date(),
                member_uuid: payload.uuid,
                member_email: payload.email,
                member_name: payload.name
            });
        } else {
            logging.warn(`${LOG_KEY} Could not track welcome email - automated email not found for slug: ${slug}`);
        }
    } catch (err) {
        logging.error({
            message: `${LOG_KEY} Failed to track welcome email send for member ${payload.id}`,
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
