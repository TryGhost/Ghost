// # Input Password Helper
// Usage: `{{input_password}}`
//
// Password input used on private.hbs for password-protected blogs

// (less) dirty requires
const proxy = require('../../../../services/proxy');

const SafeString = proxy.SafeString;
const templates = proxy.templates;

// We use the name input_password to match the helper for consistency:
module.exports = function input_password(options) { // eslint-disable-line camelcase
    options = options || {};
    options.hash = options.hash || {};

    const className = (options.hash.class) ? options.hash.class : 'private-login-password';
    let extras = 'autofocus="autofocus"';

    if (options.hash.placeholder) {
        extras += ` placeholder="${options.hash.placeholder}"`;
    }

    const output = templates.input({
        type: 'password',
        name: 'password',
        className,
        extras
    });

    return new SafeString(output);
};
