const urlUtils = require('../../../shared/url-utils');
const emailAddressService = require('../email-address');
const mail = require('../mail');

const FREE_WELCOME_EMAIL_SLUG = 'member-welcome-email-free';

/**
 * @typedef {Object} EmailTemplate
 * @property {string} lexical
 * @property {string} subject
 * @property {string|null} senderName
 * @property {string|null} senderEmail
 * @property {string|null} senderReplyTo
 */

/**
 * @typedef {Object} MailConfig
 * @property {{send: Function}} mailer
 * @property {{title: string, url: string, accentColor: string}} siteSettings
 * @property {EmailTemplate|null} emailTemplate

 */

async function loadSiteSettings({db}) {
    const settings = await db.knex('settings')
        .whereIn('key', ['title', 'accent_color', 'url'])
        .select('key', 'value');

    return settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {});
}

async function loadEmailTemplate({db}) {
    const template = await db.knex('automated_emails')
        .where('slug', FREE_WELCOME_EMAIL_SLUG)
        .first('lexical', 'subject', 'sender_name', 'sender_email', 'sender_reply_to');

    if (!template || !template.lexical) {
        return null;
    }

    return {
        lexical: urlUtils.transformReadyToAbsolute(template.lexical),
        subject: template.subject,
        senderName: template.sender_name,
        senderEmail: template.sender_email,
        senderReplyTo: template.sender_reply_to
    };
}

/**
 * Initializes mail configuration by fetching site settings and creating mailer.
 *
 * @param {Object} options
 * @param {import('../../data/db')} options.db - Database connection
 * @returns {Promise<MailConfig>}
 */
async function getMailConfig({db}) {
    emailAddressService.init();
    const mailer = new mail.GhostMailer();

    const [settingsMap, emailTemplate] = await Promise.all([
        loadSiteSettings({db}),
        loadEmailTemplate({db})
    ]);

    return {
        mailer,
        siteSettings: {
            title: settingsMap.title || 'Ghost',
            url: settingsMap.url || 'http://localhost:2368',
            accentColor: settingsMap.accent_color || '#15212A'
        },
        emailTemplate
    };
}

module.exports = getMailConfig;
