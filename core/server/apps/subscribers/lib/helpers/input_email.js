// # Input Email Helper
// Usage: `{{input_email}}`
//
// Used by `{{subscribe_form}}`

// (less) dirty requires
const proxy = require('../../../../helpers/proxy');
const SafeString = proxy.SafeString;
const templates = proxy.templates;

// We use the name input_email to match the helper for consistency:
module.exports = function input_email(options) { // eslint-disable-line camelcase
    options = options || {};
    options.hash = options.hash || {};

    const className = (options.hash.class) ? options.hash.class : 'subscribe-email';
    let extras = '';

    if (options.hash.autofocus) {
        extras += 'autofocus="autofocus"';
    }

    if (options.hash.placeholder) {
        extras += ` placeholder="${options.hash.placeholder}"`;
    }

    if (options.hash.value) {
        extras += ` value="${options.hash.value}"`;
    }

    if (options.hash.id) {
        extras += ' id="' + options.hash.id + '"';
    }

    const output = templates.input({
        type: 'email',
        name: 'email',
        className,
        extras: (extras ? extras.trim() : '')
    });

    return new SafeString(output);
};

