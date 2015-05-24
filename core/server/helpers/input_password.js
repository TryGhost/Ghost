// # Input Password Helper
// Usage: `{{input_password}}`
//
// Password input used on private.hbs for password-protected blogs
//
// We use the name meta_title to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var hbs             = require('express-hbs'),
    utils           = require('./utils'),
    input_password;

input_password = function (options) {
    options = options || {};
    options.hash = options.hash || {};

    var className = (options.hash.class) ? options.hash.class : 'private-login-password',
        extras = 'autofocus="autofocus"',
        output;

    if (options.hash.placeholder) {
        extras += ' placeholder="' + options.hash.placeholder + '"';
    }

    output = utils.inputTemplate({
        type: 'password',
        name: 'password',
        className: className,
        extras: extras
    });

    return new hbs.handlebars.SafeString(output);
};

module.exports = input_password;
