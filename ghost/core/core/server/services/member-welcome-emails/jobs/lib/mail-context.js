const errors = require('@tryghost/errors');
const emailAddressService = require('../../../email-address');
const mail = require('../../../mail');

/**
 * @typedef {Object} MailConfig
 * @property {{send: Function}} mailer
 * @property {{title: string, url: string, accentColor: string}} siteSettings
 */

/** @type {{initialized: boolean, config: MailConfig | null}} */
const MAIL_STATE = {
    initialized: false,
    config: null
};

async function loadSiteSettings(db) {
    const settings = await db.knex('settings')
        .whereIn('key', ['title', 'accent_color', 'url'])
        .select('key', 'value');

    return settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {});
}

/**
 * @param {Object} options
 * @param {import('../../../../data/db')} options.db
 * @returns {Promise<MailConfig>}
 */
async function ensureInitialized({db}) {
    if (MAIL_STATE.initialized && MAIL_STATE.config) {
        return MAIL_STATE.config;
    }

    emailAddressService.init();
    const mailer = new mail.GhostMailer();

    const settingsMap = await loadSiteSettings(db);

    MAIL_STATE.config = {
        mailer,
        siteSettings: {
            title: settingsMap.title || 'Ghost',
            url: settingsMap.url || 'http://localhost:2368',
            accentColor: settingsMap.accent_color || '#15212A'
        }
    };

    MAIL_STATE.initialized = true;

    return MAIL_STATE.config;
}

/**
 * @returns {MailConfig}
 */
function getConfig() {
    if (!MAIL_STATE.initialized || !MAIL_STATE.config) {
        throw new errors.IncorrectUsageError({
            message: 'Mail context has not been initialized'
        });
    }

    return MAIL_STATE.config;
}

module.exports = {
    ensureInitialized,
    getConfig
};
