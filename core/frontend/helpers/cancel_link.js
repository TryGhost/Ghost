// # {{cancel_link}} Helper
// Usage: `{{cancel_link}}`, `{{cancel_link class="custom-cancel-class"}}`, `{{cancel_link cancelLabel="Cancel please!"}}`
//
// Should be used inside of a subscription context, e.g.: `{{#foreach @member.subscriptions}} {{cancel_link}} {{/foreach}}`
// Outputs cancel/renew links to manage subscription renewal after the subscription period ends.
//
// Defaults to class="cancel-subscription-link" errorClass="cancel-subscription-error" cancelLabel="Cancel subscription" continueLabel="Continue subscription"

const {templates, errors, i18n, labs} = require('../services/proxy');

function cancel_link(options) { // eslint-disable-line camelcase
    let truncateOptions = (options || {}).hash || {};

    if (this.id === undefined || this.cancel_at_period_end === undefined) {
        throw new errors.IncorrectUsageError({message: i18n.t('warnings.helpers.cancel_link.invalidData')});
    }

    const data = {
        id: this.id,
        cancel_at_period_end: this.cancel_at_period_end,
        class: truncateOptions.class || 'gh-subscription-cancel',
        errorClass: truncateOptions.errorClass || 'gh-error gh-error-subscription-cancel',
        cancelLabel: truncateOptions.cancelLabel || 'Cancel subscription',
        continueLabel: truncateOptions.continueLabel || 'Continue subscription'
    };

    return templates.execute('cancel_link', data);
}

module.exports = function cancelLabsWrapper() {
    let self = this;
    let args = arguments;

    return labs.enabledHelper({
        flagKey: 'members',
        flagName: 'Members',
        helperName: 'cancel_link',
        helpUrl: 'https://ghost.org/docs/themes/members/'
    }, () => {
        return cancel_link.apply(self, args);
    });
};
