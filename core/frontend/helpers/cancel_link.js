// # {{cancel_link}} Helper
// Usage: `{{cancel_link}}`, `{{cancel_link className="custom-cancel-class"}}`, `{{cancel_link cancelLabel="Cancel please!"}}`
//
// Outputs cancel/renew buttons to manage subscription renewal after the subscription period ends.
//
// Defaults to className="cancel-subscription-button" cancelLabel="Cancel subscription"  continueLabel="Continue subscription"

const proxy = require('./proxy');

const templates = proxy.templates;

module.exports = function excerpt(options) {
    let truncateOptions = (options || {}).hash || {};

    const data = {
        id: this.id,
        cancel_at_period_end: this.cancel_at_period_end,
        className: truncateOptions.className || 'cancel-subscription-button',
        cancelLabel: truncateOptions.cancelLabel || 'Cancel subscription',
        continueLabel: truncateOptions.continueLabel || 'Continue subscription'
    };

    return templates.execute('cancel_link', data);
};

