const i18nLib = require('../i18n');
const {settingsCache} = require('../core/core/frontend/services/proxy');

let locale = settingsCache.get('locale') || 'en';

const i18nLanguage = locale;
const i18n = i18nLib(i18nLanguage, 'newsletter');

function t(key, options) {
    console.log('key is', key, "hash is", options?.hash );
    let hash = options?.hash;
    return i18n.t(key, hash);
}

module.exports = { t }