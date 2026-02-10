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
            logging.warn({
                event: 'outbox.member_created.slug_missing',
                message: 'Automated email slug not found for member status',
                log_key: LOG_KEY,
                ...getLogContext(payload)
            });
            return;
        }

        const automatedEmail = await AutomatedEmail.findOne({slug});
        if (!automatedEmail) {
            logging.warn({
                event: 'outbox.member_created.automated_email_missing',
                message: 'Automated email not found for slug',
                log_key: LOG_KEY,
                automated_email_slug: slug,
                ...getLogContext(payload)
            });
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
            event: 'outbox.member_created.tracking_failed',
            message: 'Failed to track automated welcome email send',
            log_key: LOG_KEY,
            ...getLogContext(payload),
            err
        });
    }
}

function getLogInfo(payload) {
    const email = payload?.email || 'unknown member';
    return payload?.name ? `${payload.name} (${email})` : email;
}

function getLogContext(payload) {
    return {
        member_status: payload?.status ?? null,
        member_id: payload?.memberId ?? null,
        member_uuid: payload?.uuid ?? null,
        member_email: payload?.email ?? null,
        member_name: payload?.name ?? null
    };
}

module.exports = {
    handle,
    getLogInfo,
    getLogContext,
    LOG_KEY
};
