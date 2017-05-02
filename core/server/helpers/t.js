// # t helper
// i18n: Translatable handlebars expressions for templates of the frontend, themes, and apps.
// Frontend: .hbs templates in core/server. Themes: in content/themes. Apps: in content/apps.
// Translations are defined in files such as core/server/translations/en.json, etc.
//
// Usage examples, in .hbs templates:
//
// {{t "frontend" "Older Posts"}}
// {{t "mytheme" "Get the latest posts delivered right to your inbox"}}
// {{{t "mytheme" "Proudly published with {ghostLink}" ghostLink="<a href=\"https://ghost.org\">Ghost</a>"}}}
//
// And in .json translation files, for example for Spanish:
//
// "frontend": {
//     "Older Posts": "Artículos Anteriores"
// }
//
// "mytheme": {
//     "Get the latest posts delivered right to your inbox": "Recibe los últimos artículos directamente en tu buzón",
//     "Proudly published with {ghostLink}": "Publicado con {ghostLink}"
// }

var proxy = require('./proxy'),
    jp = require('jsonpath'),
    i18n = proxy.i18n,
    bindings = {},
    SafeString = proxy.SafeString,
    path;

module.exports = function t(where, what, options) {
    path = jp.stringify(['$', where, what]);
    for (var prop in options.hash) {
        if (options.hash.hasOwnProperty(prop)) {
            bindings[prop] = options.hash[prop];
        }
    }
    return new SafeString(i18n.t(path, bindings));
};
