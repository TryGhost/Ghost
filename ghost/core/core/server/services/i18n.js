const debug = require('@tryghost/debug')('i18n');

/** @type {import('i18next').i18n} */
let i18nInstance;

module.exports.init = function () {
    const i18n = require('@tryghost/i18n');
    const events = require('../lib/common/events');
    const settingsCache = require('../../shared/settings-cache');

    const locale = settingsCache.get('locale') || 'en';

    module.exports = i18nInstance = i18n(locale, 'ghost');

    events.on('settings.locale.edited', (model) => {
        debug('locale changed, updating i18n to', model.get('value'));
        i18nInstance.changeLanguage(model.get('value'));
    });
};