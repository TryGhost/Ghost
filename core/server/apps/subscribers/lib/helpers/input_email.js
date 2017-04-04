// # Input Email Helper
// Usage: `{{input_email}}`
//
// Used by `{{subscribe_form}}`
//
// We use the name input_email to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

// (less) dirty requires
var proxy = require('../../../../helpers/proxy'),
    SafeString = proxy.SafeString,
    templates = proxy.templates;

module.exports = function input_email(options) {
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

    output = templates.input({
        type: 'email',
        name: 'email',
        className: className,
        extras: extras
    });

    return new SafeString(output);
};

