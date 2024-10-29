const debug = require('@tryghost/debug')('i18n');

/** @type {import('i18next').i18n} */
let i18nInstance;

module.exports.init = function () {
    const i18n = require('@tryghost/i18n');
    const events = require('../lib/common/events');
    const settingsCache = require('../../shared/settings-cache');
    const labs = require('../../shared/labs');

    let locale = 'en';

    if (labs.isSet('i18n')) {
        locale = settingsCache.get('locale');
    }

    module.exports = i18nInstance = i18n(locale, 'ghost');

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
};