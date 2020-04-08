// # {{price}} helper
//
// Usage: `{{price 2100}}`
//
// Returns amount equal to the dominant denomintation of the currency.
// For example, if 2100 is passed, it will return 21.
const isNumber = require('lodash/isNumber');
const {errors, i18n} = require('../services/proxy');

module.exports = function price(amount) {
    // CASE: if no amount is passed, e.g. `{{price}}` we throw an error
    if (arguments.length < 2) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.price.attrIsRequired')
        });
    }

    // CASE: if amount is passed, but it is undefined we throw an error
    if (amount === undefined) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.price.attrIsRequired')
        });
    }

    if (!isNumber(amount)) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.price.attrMustBeNumeric')
        });
    }

    return amount / 100;
};
