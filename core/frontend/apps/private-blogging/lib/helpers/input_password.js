// # Input Password Helper
// Usage: `{{input_password}}`
//
// Password input used on private.hbs for password-protected blogs

// (less) dirty requires
const proxy = require('../../../../helpers/proxy'),
    SafeString = proxy.SafeString,
    templates = proxy.templates;

// We use the name input_password to match the helper for consistency:
module.exports = function input_password(options) { // eslint-disable-line camelcase
    options = options || {};
    options.hash = options.hash || {};

    let className = (options.hash.class) ? options.hash.class : 'private-login-password',
        extras = 'autofocus="autofocus"',
        output;

    if (options.hash.placeholder) {
        extras += ` placeholder="${options.hash.placeholder}"`;
    }

    output = templates.input({
        type: 'password',
        name: 'password',
        className,
        extras
    });

    return new SafeString(output);
};
