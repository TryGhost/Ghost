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

var proxy = require('./proxy'),
    jp = require('jsonpath'),
    i18n = proxy.i18n,
    settingsCache = proxy.settingsCache,
    bindings = {},
    path;

module.exports = function t(text, options) {
    var prop, theme;
    for (prop in options.hash) {
        if (options.hash.hasOwnProperty(prop)) {
            bindings[prop] = options.hash[prop];
        }
    }
    bindings.defaultString = text;
    theme = settingsCache.get('active_theme') || 'casper';
    path = jp.stringify(['$', theme, text]);
    return i18n.t(path, bindings);
};
