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
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    oopsErrorTemplateHasError: 'Oops, seems there is an error in the template.'
};

module.exports = function t(text, options) {
    if (text === undefined && options === undefined) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.oopsErrorTemplateHasError)
        });
    }

    const bindings = {};
    let prop;
    for (prop in options.hash) {
        if (Object.prototype.hasOwnProperty.call(options.hash, prop)) {
            bindings[prop] = options.hash[prop];
        }
    }

    return themeI18n.t(text, bindings);
};
