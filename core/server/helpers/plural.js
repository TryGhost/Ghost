// # Plural Helper
// Usage: `{{plural 0 empty='No posts' singular='% post' plural='% posts'}}`
//
// pluralises strings depending on item count
//
// The 1st argument is the numeric variable which the helper operates on
// The 2nd argument is the string that will be output if the variable's value is 0
// The 3rd argument is the string that will be output if the variable's value is 1
// The 4th argument is the string that will be output if the variable's value is 2+

var proxy = require('./proxy'),
    _ = require('lodash'),
    errors = proxy.errors,
    i18n = proxy.i18n,
    SafeString = proxy.SafeString;

module.exports = function plural(number, options) {
    if (_.isUndefined(options.hash) || _.isUndefined(options.hash.empty) ||
        _.isUndefined(options.hash.singular) || _.isUndefined(options.hash.plural)) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.plural.valuesMustBeDefined')
        });
    }

    if (number === 0) {
        return new SafeString(options.hash.empty.replace('%', number));
    } else if (number === 1) {
        return new SafeString(options.hash.singular.replace('%', number));
    } else if (number >= 2) {
        return new SafeString(options.hash.plural.replace('%', number));
    }
};

