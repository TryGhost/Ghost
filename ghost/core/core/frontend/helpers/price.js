// # {{price}} helper
//
// Usage: `{{price 2100}}`
// Usage: `{{price plan}}`
// Usage: `{{price plan numberFormat="long"}}`
// Usage: `{{price plan currencyFormat="code"}}`
// Usage: `{{price plan currencyFormat="name"}}`
// Usage: `{{price 500 currency="USD"}}`
// Usage: `{{price currency="USD"}}`
//
// Returns amount equal to the dominant denomination of the currency.
// For example, if 2100 is passed, it will return 21.
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const _ = require('lodash');

const messages = {
    attrIsRequired: 'Attribute is required e.g. {{price plan.amount}}',
    attrMustBeNumeric: 'Attribute value should be a number'
};

function formatter({amount, currency, numberFormat = 'short', currencyFormat = 'symbol', locale}) {
    const formatterOptions = {
        style: 'currency',
        currency: currency,
        currencyDisplay: currencyFormat
    };
    if (numberFormat === 'short') {
        formatterOptions.minimumFractionDigits = 0;
    }
    if (_.isNumber(amount)) {
        return new Intl.NumberFormat(locale, formatterOptions).format(amount);
    } else {
        const val = new Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            currencyDisplay: 'symbol',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(0);
        return val.replace(/[\d\s.,]/g, '');
    }
}

module.exports = function price(planOrAmount, options) {
    let plan;
    let amount;
    if (arguments.length === 1) {
        options = planOrAmount;
    }

    if (arguments.length === 2) {
        if (_.isNumber(planOrAmount)) {
            amount = planOrAmount;
        } else if (_.isObject(planOrAmount)) {
            plan = planOrAmount;
        }
    }
    options = options || {};
    options.hash = options.hash || {};

    const {currency, numberFormat = 'short', currencyFormat = 'symbol', locale = _.get(options, 'data.site.locale', 'en')} = options.hash;
    if (plan) {
        return formatter({
            amount: plan.amount && (plan.amount / 100),
            currency: currency || plan.currency,
            currencyFormat,
            numberFormat,
            locale
        });
    }

    if (currency) {
        return formatter({
            amount: amount && (amount / 100),
            currency: currency,
            currencyFormat,
            numberFormat,
            locale
        });
    }

    // CASE: if no amount is passed, e.g. `{{price}}` we throw an error
    if (arguments.length < 2) {
        logging.warn(tpl(messages.attrIsRequired));
        return '';
    }

    // CASE: if amount is passed, but it is undefined we throw an error
    if (amount === undefined) {
        logging.warn(tpl(messages.attrIsRequired));
        return '';
    }

    if (!_.isNumber(amount)) {
        logging.warn(tpl(messages.attrMustBeNumeric));
        return '';
    }

    return amount / 100;
};
