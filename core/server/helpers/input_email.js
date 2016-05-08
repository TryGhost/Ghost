// # Input Email Helper
// Usage: `{{input_email}}`
//
// Password input used on private.hbs for password-protected blogs
//
// We use the name meta_title to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var hbs             = require('express-hbs'),
    utils           = require('./utils'),
    input_email;

input_email = function (options) {
    options = options || {};
    options.hash = options.hash || {};

    var className = (options.hash.class) ? options.hash.class : 'subscribe-email',
        extras = '',
        output;

    if (options.hash.autofocus) {
        extras += 'autofocus="autofocus"';
    }

    if (options.hash.placeholder) {
        extras += ' placeholder="' + options.hash.placeholder + '"';
    }

    if (options.hash.value) {
        extras += ' value="' + options.hash.value + '"';
    }

    output = utils.inputTemplate({
        type: 'email',
        name: 'email',
        className: className,
        extras: extras
    });

    return new hbs.handlebars.SafeString(output);
};

module.exports = input_email;
