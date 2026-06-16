const assert = require('node:assert/strict');
const debug = require('@tryghost/debug')('i18n');

let i18nInstance;

exports.changeLanguage = (...args) => {
    assert(i18nInstance, 'Expected i18n instance to be initialized');
    return i18nInstance.changeLanguage(...args);
};

exports.dir = (...args) => {
    assert(i18nInstance, 'Expected i18n instance to be initialized');
    return i18nInstance.dir(...args);
};

exports.t = (...args) => {
    assert(i18nInstance, 'Expected i18n instance to be initialized');
    return i18nInstance.t(...args);
};

exports.init = () => {
    const i18n = require('@tryghost/i18n');
    const events = require('../lib/common/events');
    const settingsCache = require('../../shared/settings-cache');

    const locale = settingsCache.get('locale') || 'en';

    i18nInstance = i18n(locale, 'ghost');

    events.on('settings.locale.edited', (model) => {
        debug('locale changed, updating i18n to', model.get('value'));
        i18nInstance.changeLanguage(model.get('value'));
    });
};