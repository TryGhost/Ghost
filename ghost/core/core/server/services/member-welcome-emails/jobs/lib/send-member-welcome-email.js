const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const {MEMBER_WELCOME_EMAIL_LOG_KEY} = require('./constants');
const config = require('../../../../../shared/config');
const renderWelcomeHtml = require('./email-templates/welcome.html');
const renderWelcomeText = require('./email-templates/welcome.txt');

/** @typedef {import('./get-mail-config').MailConfig} MailConfig */

/**
 * Sends a welcome email to a new member
 * @param {Object} options
 * @param {Object} options.payload - Member data containing name and email
 * @param {MailConfig} options.mailConfig - Preloaded mailer + site settings shared across job
 */
async function sendMemberWelcomeEmail({payload, mailConfig}) {
    const name = payload?.name ? `${payload.name} at ` : '';
    logging.info(`${MEMBER_WELCOME_EMAIL_LOG_KEY} Sending welcome email to ${name}${payload?.email}`);
    const templateData = {
        memberName: payload.name,
        siteTitle: mailConfig.siteSettings.title,
        siteUrl: mailConfig.siteSettings.url,
        accentColor: mailConfig.siteSettings.accentColor
    };

    const html = renderWelcomeHtml(templateData);
    const text = renderWelcomeText(templateData);

    // This is for testing the functionality by sending to a shared inbox instead of the actual member inbox
    // In the future this will check that payload.email exists instead
    const toEmail = config.get('memberWelcomeEmailTestInbox');
    if (!toEmail) {
        throw new errors.IncorrectUsageError({
            message: 'memberWelcomeEmailTestInbox config is required but not defined'
        });
    }

    await mailConfig.mailer.send({
        to: toEmail,
        subject: `Welcome to ${mailConfig.siteSettings.title}!`,
        html,
        text,
        forceTextContent: true
    });
}

module.exports = sendMemberWelcomeEmail;
