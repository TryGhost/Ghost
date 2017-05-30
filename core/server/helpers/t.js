// # t helper
// i18n: Translatable handlebars expressions for templates of the frontend, themes, and apps.
// Frontend: .hbs templates in core/server. Themes: in content/themes. Apps: in content/apps.
//
// Usage examples, for example in .hbs theme templates:
// {{t "Get the latest posts delivered right to your inbox"}}
// {{{t "Proudly published with {ghostlink}" ghostlink="<a href=\"https://ghost.org\">Ghost</a>"}}}
//
// The few sentences in *.hbs* core frontend templates need a `where` parameter, not needed for themes:
// {{t "You've successfully subscribed to" where="frontend"}}
//
// Probably, developers of future apps with templates will also use this parameter, e.g. `where="myapp"`
// (there will likely be one theme and several apps enabled at the same time).
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
    var prop, where;
    for (prop in options.hash) {
        if (options.hash.hasOwnProperty(prop)) {
            if (prop === 'where') {
                where = options.hash[prop];
            } else {
                bindings[prop] = options.hash[prop];
            }
        }
    }
    where = where || settingsCache.get('active_theme');
    path = jp.stringify(['$', where, text]);
    return i18n.t(path, bindings);
};
