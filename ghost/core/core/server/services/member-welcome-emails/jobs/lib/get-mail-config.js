const emailAddressService = require('../../../email-address');
const mail = require('../../../mail');

/**
 * @typedef {Object} MailConfig
 * @property {{send: Function}} mailer
 * @property {{title: string, url: string, accentColor: string}} siteSettings
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

/**
 * Initializes mail configuration by fetching site settings and creating mailer.
 *
 * @param {Object} options
 * @param {import('../../../../data/db')} options.db - Database connection
 * @returns {Promise<MailConfig>}
 */
async function getMailConfig({db}) {
    emailAddressService.init();
    const mailer = new mail.GhostMailer();

    const settingsMap = await loadSiteSettings({db});

    return {
        mailer,
        siteSettings: {
            title: settingsMap.title || 'Ghost',
            url: settingsMap.url || 'http://localhost:2368',
            accentColor: settingsMap.accent_color || '#15212A'
        }
    };
}

module.exports = getMailConfig;
