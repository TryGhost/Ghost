// # {{cancel_link}} Helper
// Usage: `{{cancel_link}}`, `{{cancel_link className="custom-cancel-class"}}`, `{{cancel_link cancelLabel="Cancel please!"}}`
//
// Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
//
// Defaults to words="50"

const proxy = require('./proxy');

const templates = proxy.templates;

module.exports = function excerpt(options) {
    let truncateOptions = (options || {}).hash || {};

    const data = {
        className: truncateOptions.cancelLabel || 'cancel-subscription-button',
        cancelLabel: truncateOptions.cancelLabel || 'Cancel subscription',
        continueLabel: truncateOptions.continueLabel || 'Continue subscription'
    };

    return templates.execute('cancel_link', this, {data});
};

