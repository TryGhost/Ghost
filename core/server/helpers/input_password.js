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

input_password = function () {
    var output = utils.inputTemplate({
        type: 'password',
        name: 'password',
        className: 'private-login-password',
        extras: 'autofocus="autofocus"'
    });

    return new hbs.handlebars.SafeString(output);
};

module.exports = input_password;
