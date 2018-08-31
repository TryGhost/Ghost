// # Input Email Helper
// Usage: `{{input_email}}`
//
// Used by `{{subscribe_form}}`

// (less) dirty requires
var proxy = require('../../../../helpers/proxy'),
    SafeString = proxy.SafeString,
    templates = proxy.templates;

// We use the name input_email to match the helper for consistency:
module.exports = function input_email(options) { // eslint-disable-line camelcase
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

    if (options.hash.id) {
        extras += ' id="' + options.hash.id + '"';
    }

    output = templates.input({
        type: 'email',
        name: 'email',
        className: className,
        extras: (extras ? extras.trim() : '')
    });

    return new SafeString(output);
};

