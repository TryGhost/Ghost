const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const memberWelcomeEmailService = require('../../member-welcome-emails/service');
const logging = require('@tryghost/logging');
const {WelcomeEmailAutomation, AutomatedEmailRecipient} = require('../../../models');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../member-welcome-emails/constants');

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload}) {
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

        const automation = await WelcomeEmailAutomation.findOne({slug}, {withRelated: ['welcomeEmailAutomatedEmail']});
        if (!automation) {
            logging.warn({
                system: {
                    event: 'outbox.member_created.no_automated_email',
                    slug
                }
            }, `${LOG_KEY} No automated email found for slug: ${slug}`);
            return;
        }

        // NOTE(NY-1190): This naively assumes each drip sequence will have
        // just one email. When we change that assumption, this line will need
        // to change to something like:
        //
        // ```
        // SELECT * FROM welcome_email_automated_emails
        // WHERE welcome_email_automation_id IS ?
        // AND id NOT IN (
        //   SELECT next_id FROM welcome_email_automated_emails
        //   WHERE next_id IS NOT NULL
        //   AND welcome_email_automation_id IS ?
        // );
        // ```
        const email = automation.related('welcomeEmailAutomatedEmail');
        if (!email || !email.id) {
            logging.warn({
                system: {
                    event: 'outbox.member_created.no_automated_email',
                    slug
                }
            }, `${LOG_KEY} No automated email content found for slug: ${slug}`);
            return;
        }

        await AutomatedEmailRecipient.add({
            member_id: payload.memberId,
            automated_email_id: email.id,
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
