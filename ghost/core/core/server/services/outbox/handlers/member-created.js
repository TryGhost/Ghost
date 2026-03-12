const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const memberWelcomeEmailService = require('../../member-welcome-emails/service');
const logging = require('@tryghost/logging');
const {AutomatedEmail, AutomatedEmailRecipient} = require('../../../models');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../member-welcome-emails/constants');

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload}) {
    // Check if the welcome email is still active before attempting to send.
    // If the template was disabled after this outbox entry was created,
    // we skip sending and let the entry be deleted from the outbox.
    const isActive = await memberWelcomeEmailService.api.isMemberWelcomeEmailActive(payload.status);
    if (!isActive) {
        logging.info({
            system: {
                event: 'outbox.member_created.skipped_inactive',
                member_status: payload.status
            }
        }, `${LOG_KEY} Skipping send for ${payload.email || 'unknown'} — welcome email for "${payload.status}" members is inactive`);
        return;
    }

    await memberWelcomeEmailService.api.send({member: payload, memberStatus: payload.status});

    try {
        const slug = MEMBER_WELCOME_EMAIL_SLUGS[payload.status];
        if (!slug) {
            logging.warn({
                system: {
                    event: 'outbox.member_created.no_slug_mapping',
                    member_status: payload.status
                }
            }, `${LOG_KEY} No automated email slug found for member status`);
            return;
        }

        const automatedEmail = await AutomatedEmail.findOne({slug});
        if (!automatedEmail) {
            logging.warn({
                system: {
                    event: 'outbox.member_created.no_automated_email',
                    slug
                }
            }, `${LOG_KEY} No automated email found for slug: ${slug}`);
            return;
        }

        await AutomatedEmailRecipient.add({
            member_id: payload.memberId,
            automated_email_id: automatedEmail.id,
            member_uuid: payload.uuid,
            member_email: payload.email,
            member_name: payload.name
        });
    } catch (err) {
        logging.error({
            system: {
                event: 'outbox.member_created.track_send_failed'
            },
            err
        }, `${LOG_KEY} Failed to track automated email send`);
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
