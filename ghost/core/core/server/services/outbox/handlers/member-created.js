const {OUTBOX_LOG_KEY} = require('../jobs/lib/constants');
const memberWelcomeEmailService = require('../../member-welcome-emails/service');
const logging = require('@tryghost/logging');
const {Automation, AutomatedEmailRecipient, Member, WelcomeEmailAutomationRun} = require('../../../models');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../member-welcome-emails/constants');
const labs = require('../../../../shared/labs');

const LOG_KEY = `${OUTBOX_LOG_KEY}[MEMBER-WELCOME-EMAIL]`;

async function handle({payload}) {
    const automationContext = await getAutomationContext(payload);

    try {
        await memberWelcomeEmailService.api.send({
            member: payload,
            memberStatus: payload.status,
            runId: automationContext.run?.id
        });
    } catch (err) {
        if (automationContext.run) {
            try {
                await markRunExited(automationContext.run.id, 'email send failed');
            } catch (markErr) {
                logging.error({
                    system: {
                        event: 'outbox.member_created.track_send_failed'
                    },
                    err: markErr
                }, `${LOG_KEY} Failed to mark automated email run failed`);
            }
        }
        throw err;
    }

    if (!automationContext.email) {
        return;
    }

    try {
        await AutomatedEmailRecipient.add({
            member_id: payload.memberId,
            automated_email_id: automationContext.email.id,
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

    if (automationContext.run) {
        try {
            await markRunExited(automationContext.run.id, 'finished');
        } catch (err) {
            logging.error({
                system: {
                    event: 'outbox.member_created.track_send_failed'
                },
                err
            }, `${LOG_KEY} Failed to mark automated email run finished`);
        }
    }
}

async function getAutomationContext(payload) {
    try {
        const slug = MEMBER_WELCOME_EMAIL_SLUGS[payload.status];
        if (!slug) {
            logging.warn({
                system: {
                    event: 'outbox.member_created.no_slug_mapping',
                    member_status: payload.status
                }
            }, `${LOG_KEY} No automated email slug found for member status`);
            return {};
        }

        const automation = await Automation.findOne({slug}, {withRelated: ['welcomeEmailAutomatedEmail']});
        if (!automation) {
            logging.warn({
                system: {
                    event: 'outbox.member_created.no_automated_email',
                    slug
                }
            }, `${LOG_KEY} No automated email found for slug: ${slug}`);
            return {};
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
            return {};
        }

        let run = null;
        if (labs.isSet('automations')) {
            try {
                const member = await Member.findOne({id: payload.memberId});
                if (member) {
                    run = await WelcomeEmailAutomationRun.add({
                        welcome_email_automation_id: automation.id,
                        member_id: payload.memberId,
                        next_welcome_email_automated_email_id: email.id,
                        ready_at: new Date(),
                        step_started_at: null,
                        step_attempts: 0,
                        exit_reason: null
                    });
                }
            } catch (err) {
                logging.error({
                    system: {
                        event: 'outbox.member_created.track_send_failed'
                    },
                    err
                }, `${LOG_KEY} Failed to create automated email run`);
            }
        }

        return {email, run};
    } catch (err) {
        logging.error({
            system: {
                event: 'outbox.member_created.track_send_failed'
            },
            err
        }, `${LOG_KEY} Failed to track automated email send`);
        return {};
    }
}

async function markRunExited(runId, exitReason) {
    await WelcomeEmailAutomationRun.edit({
        next_welcome_email_automated_email_id: null,
        ready_at: null,
        step_started_at: null,
        step_attempts: 0,
        exit_reason: exitReason,
        updated_at: new Date()
    }, {id: runId});
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
