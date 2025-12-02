// # t helper
// i18n: Translatable handlebars expressions for templates of the front-end and themes.
// Front-end: .hbs templates in core/server, overridden by copies in themes. Themes: in content/themes.
//
// Usage examples, for example in .hbs theme templates:
// {{t "Get the latest posts delivered right to your inbox"}}
// {{{t "Proudly published with {ghostlink}" ghostlink="<a href=\"https://ghost.org\">Ghost</a>"}}}
//
// To preserve HTML, use {{{t}}}. This helper doesn't use a SafeString object which would prevent escaping,
// because often other helpers need that (t) returns a string to be able to work as subexpression; e.g.:
// {{tags prefix=(t " on ")}}

const {themeI18n} = require('../services/handlebars');
const {themeI18next} = require('../services/handlebars');
const labs = require('../../shared/labs');
const settingsCache = require('../../shared/settings-cache');
const debug = require('@tryghost/debug')('i18n:t');

module.exports = function t(text, options = {}) {
    if (!text || text.length === 0) {
        // no-op: translation key is missing, return an empty string
        return '';
    }

    const bindings = {};
    let prop;
    for (prop in options.hash) {
        if (Object.prototype.hasOwnProperty.call(options.hash, prop)) {
            bindings[prop] = options.hash[prop];
        }
    }

    if (labs.isSet('themeTranslation')) {
        // Use the new translation package when feature flag is enabled
        debug('using new translation service');
        if (!themeI18next._i18n) {
            debug('themeI18next will be initialized');
            themeI18next.init({
                activeTheme: settingsCache.get('active_theme'),
                locale: settingsCache.get('locale')
            });
        }
        return themeI18next.t(text, bindings);
    } else {
        debug('using old translation service');
        // Use the existing translation package when feature flag is disabled
        if (!themeI18n._strings) {
            debug('themeI18n will be initialized');
            themeI18n.init({
                activeTheme: settingsCache.get('active_theme'),
                locale: settingsCache.get('locale')
            });
        }
        return themeI18n.t(text, bindings);
    }
};
