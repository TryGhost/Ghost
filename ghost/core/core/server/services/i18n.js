const debug = require('@tryghost/debug')('i18n');
const errors = require('@tryghost/errors');

/** @type {import('i18next').i18n} */
let i18nInstance;

/**
 * Loads translations for a specific locale
 * @param {string} locale - The locale to load translations for
 * @returns {Promise<void>} A promise that resolves when the translations are loaded
 */
async function loadLocale(locale) {
    if (!i18nInstance) {
        throw new errors.InternalServerError({
            message: 'i18n not initialized'
        });
    }
    return i18nInstance.loadLanguages(locale);
}

/**
 * Temporarily changes the locale for a specific operation
 * @param {string} locale - The locale to use
 * @param {Function} operation - The operation to perform with the temporary locale
 * @returns {Promise<any>} The result of the operation
 */
async function withLocale(locale, operation) {
    if (!i18nInstance) {
        throw new errors.InternalServerError({
            message: 'i18n not initialized'
        });
    }
    // Load the locale if not already loaded
    await i18nInstance.loadLanguages(locale);
    // Get a fixed t function for this locale
    const t = i18nInstance.getFixedT(locale);
    // Execute the operation with the fixed t function
    return await operation(t);
}

function init() {
    const i18n = require('@tryghost/i18n');
    const events = require('../lib/common/events');
    const settingsCache = require('../../shared/settings-cache');
    const labs = require('../../shared/labs');

    let locale = 'en';

    if (labs.isSet('i18n')) {
        locale = settingsCache.get('locale');
    }

    i18nInstance = i18n(locale, 'ghost');

    events.on('settings.labs.edited', () => {
        if (labs.isSet('i18n')) {
            debug('labs i18n enabled, updating i18n to', settingsCache.get('locale'));
            i18nInstance.changeLanguage(settingsCache.get('locale'));
        } else {
            debug('labs i18n disabled, updating i18n to en');
            i18nInstance.changeLanguage('en');
        }
    });

    events.on('settings.locale.edited', (model) => {
        if (labs.isSet('i18n')) {
            debug('locale changed, updating i18n to', model.get('value'));
            i18nInstance.changeLanguage(model.get('value'));
        }
    });
}

module.exports = {
    init,
    loadLocale,
    withLocale,
    get t() {
        return i18nInstance.t;
    },
    get changeLanguage() {
        return i18nInstance.changeLanguage.bind(i18nInstance);
    }
};