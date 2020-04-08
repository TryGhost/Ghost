// # Plural Helper
// Usage example: `{{plural ../pagination.total empty='No posts' singular='1 post' plural='% posts'}}`
// or for translatable themes, with (t) translation helper's subexpressions:
// `{{plural ../pagination.total empty=(t "No posts") singular=(t "1 post") plural=(t "% posts")}}`
//
// Pluralises strings depending on item count
//
// The 1st argument is the numeric variable which the helper operates on
// The 2nd argument is the string that will be output if the variable's value is 0
// The 3rd argument is the string that will be output if the variable's value is 1
// The 4th argument is the string that will be output if the variable's value is 2+

const {errors, i18n, SafeString} = require('../services/proxy');
const isUndefined = require('lodash/isUndefined');

module.exports = function plural(number, options) {
    if (isUndefined(options.hash) || isUndefined(options.hash.empty) ||
        isUndefined(options.hash.singular) || isUndefined(options.hash.plural)) {
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
