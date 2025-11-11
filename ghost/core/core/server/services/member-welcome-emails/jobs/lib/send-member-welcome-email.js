const logging = require('@tryghost/logging');
const {MEMBER_WELCOME_EMAIL_LOG_KEY} = require('./constants');
const config = require('../../../../../shared/config');
const renderWelcomeHtml = require('./email-templates/welcome.html');
const renderWelcomeText = require('./email-templates/welcome.txt');

/** @typedef {import('./mail-context').MailConfig} MailConfig */

/**
 * Sends a welcome email to a new member
 * @param {Object} payload - Member data containing name and email
 * @param {MailConfig} mailConfig - Preloaded mailer + site settings shared across job
 */
async function sendMemberWelcomeEmail(payload, mailConfig) {
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

    const toEmail = config.get('memberWelcomeEmailTestInbox');
    await mailConfig.mailer.send({
        to: toEmail,
        subject: `Welcome to ${mailConfig.siteSettings.title}!`,
        html,
        text,
        forceTextContent: true
    });
}

module.exports = sendMemberWelcomeEmail;
