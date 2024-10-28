const i18nLib = require('../i18n');
const {settingsCache} = require('../core/core/frontend/services/proxy');

let locale = settingsCache.get('locale') || 'en';

const i18nLanguage = locale;
const i18n = i18nLib(i18nLanguage, 'newsletter');

function t(key, options) {
    // same function serves both handlebars (arguments in options.hash) and javascript (arguments in options)
    let hash = options?.hash;
    return i18n.t(key, hash || options || {});
}

module.exports = {t};