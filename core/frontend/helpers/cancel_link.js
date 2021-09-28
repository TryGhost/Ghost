// # {{cancel_link}} Helper
// Usage: `{{cancel_link}}`, `{{cancel_link class="custom-cancel-class"}}`, `{{cancel_link cancelLabel="Cancel please!"}}`
//
// Should be used inside of a subscription context, e.g.: `{{#foreach @member.subscriptions}} {{cancel_link}} {{/foreach}}`
// Outputs cancel/renew links to manage subscription renewal after the subscription period ends.
//
// Defaults to class="cancel-subscription-link" errorClass="cancel-subscription-error" cancelLabel="Cancel subscription" continueLabel="Continue subscription"
const {labs} = require('../services/proxy');
const {templates} = require('../services/rendering');

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidData: 'The {{cancel_link}} helper was used outside of a subscription context. See https://ghost.org/docs/themes/members/#cancel-links.'
};

function cancel_link(options) { // eslint-disable-line camelcase
    let truncateOptions = (options || {}).hash || {};

    if (this.id === undefined || this.cancel_at_period_end === undefined) {
        throw new errors.IncorrectUsageError({message: tpl(messages.invalidData)});
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
