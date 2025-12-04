const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const {MEMBER_WELCOME_EMAIL_LOG_KEY, MESSAGES} = require('./constants');
const config = require('../../../shared/config');
const MemberWelcomeEmailRenderer = require('./MemberWelcomeEmailRenderer');

/** @typedef {import('./get-mail-config').MailConfig} MailConfig */

let renderer = null;

function getRenderer() {
    if (!renderer) {
        renderer = new MemberWelcomeEmailRenderer();
    }
    return renderer;
}

/**
 * Sends a welcome email to a new member
 * @param {Object} options
 * @param {Object} options.payload - Member data containing name and email
 * @param {MailConfig} options.mailConfig - Preloaded mailer + site settings shared across job
 */
async function sendMemberWelcomeEmail({payload, mailConfig}) {
    const name = payload?.name ? `${payload.name} at ` : '';
    logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Sending welcome email to ${name}${payload?.email}`);

    if (!mailConfig.emailTemplate) {
        throw new errors.IncorrectUsageError({
            message: MESSAGES.NO_EMAIL_TEMPLATE
        });
    }

    const {html, text, subject} = await getRenderer().render({
        lexical: mailConfig.emailTemplate.lexical,
        subject: mailConfig.emailTemplate.subject,
        member: {
            name: payload.name,
            email: payload.email
        },
        siteSettings: mailConfig.siteSettings
    });

    const toEmail = config.get('memberWelcomeEmailTestInbox');
    if (!toEmail) {
        throw new errors.IncorrectUsageError({
            message: 'memberWelcomeEmailTestInbox config is required but not defined'
        });
    }

    await mailConfig.mailer.send({
        to: toEmail,
        subject,
        html,
        text,
        forceTextContent: true
    });
}

module.exports = sendMemberWelcomeEmail;
