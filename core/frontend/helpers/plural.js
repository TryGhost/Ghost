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
const {SafeString} = require('../services/handlebars');

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const isUndefined = require('lodash/isUndefined');

const messages = {
    valuesMustBeDefined: 'All values must be defined for empty, singular and plural'
};

module.exports = function plural(number, options) {
    if (isUndefined(options.hash) || isUndefined(options.hash.empty) ||
        isUndefined(options.hash.singular) || isUndefined(options.hash.plural)) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.valuesMustBeDefined)
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
