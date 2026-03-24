// # {{offer_duration}} Helper
// Usage: `{{offer_duration}}`
//
// Should be used inside of a subscription context, e.g.:
// `{{#foreach @member.subscriptions}} {{price next_payment interval="true"}} — {{offer_duration}} {{/foreach}}`
//
// Outputs the duration context of an active discount on a subscription.
// Returns "Forever", "Ends {date}", or an empty string if no active discount.
// Consistent with the duration part of Portal's offer label on the member account page.
const {SafeString} = require('../services/handlebars');
const {labs} = require('../services/proxy');

function formatDate(isoDate) {
    if (!isoDate) {
        return '';
    }
    const event = new Date(isoDate);
    const options = {year: 'numeric', month: 'short', day: 'numeric'};
    return event.toLocaleDateString('en-GB', options);
}

function offer_duration() { // eslint-disable-line camelcase
    const nextPayment = this.next_payment;

    if (!nextPayment) {
        return '';
    }

    const discount = nextPayment.discount;

    if (!discount) {
        return '';
    }

    let durationLabel = '';
    if (discount.duration === 'forever') {
        durationLabel = 'Forever';
    } else if (discount.duration === 'repeating' && discount.end) {
        durationLabel = `Ends ${formatDate(discount.end)}`;
    } else if (discount.duration === 'once' && this.current_period_end) {
        // By design, "once" offers don't have a discount end in Stripe.
        // They expire at the end of the current billing period.
        durationLabel = `Ends ${formatDate(this.current_period_end)}`;
    }

    return new SafeString(durationLabel);
}

module.exports = function offerDurationLabsWrapper() {
    let self = this;
    let args = arguments;

    return labs.enabledHelper({
        flagKey: 'members',
        flagName: 'Members',
        helperName: 'offer_duration',
        helpUrl: 'https://ghost.org/docs/themes/members/'
    }, () => {
        return offer_duration.apply(self, args); // eslint-disable-line camelcase
    });
};
