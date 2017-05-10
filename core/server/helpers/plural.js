// # Plural Helper
// Usage: `{{plural 0 where='mytheme' empty='No posts' singular='1 post' plural='% posts'}}`
//
// pluralises strings depending on item count
//
// The 1st argument is the numeric variable which the helper operates on
// The 2nd argument is the place where it's used: frontend, or name of theme or app
// The 3rd argument is the i18n string that will be output if the variable's value is 0
// The 4th argument is the i18n string that will be output if the variable's value is 1
// The 5th argument is the i18n string that will be output if the variable's value is 2+
//
// Translations are defined in files: core/server/translations/en.json, etc.

var proxy = require('./proxy'),
    _ = require('lodash'),
    jp = require('jsonpath'),
    errors = proxy.errors,
    i18n = proxy.i18n,
    SafeString = proxy.SafeString,
    optionsEmpty,
    optionsSingular,
    optionsPlural;

module.exports = function plural(number, options) {
    if (_.isUndefined(options.hash) || _.isUndefined(options.hash.empty) ||
        _.isUndefined(options.hash.singular) || _.isUndefined(options.hash.plural)) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.plural.valuesMustBeDefined')
        });
    }

    // Compatibility with both old themes and i18n-capable themes.
    if (options.hash.where) {
        optionsEmpty = i18n.t(jp.stringify(['$', options.hash.where, options.hash.empty]));
        optionsSingular = i18n.t(jp.stringify(['$', options.hash.where, options.hash.singular]));
        optionsPlural = i18n.t(jp.stringify(['$', options.hash.where, options.hash.plural]));
    } else {
        optionsEmpty = options.hash.empty;
        optionsSingular = options.hash.singular;
        optionsPlural = options.hash.plural;
    }

    if (number === 0) {
        return new SafeString(optionsEmpty.replace('%', number));
    } else if (number === 1) {
        return new SafeString(optionsSingular.replace('%', number));
    } else if (number >= 2) {
        return new SafeString(optionsPlural.replace('%', number));
    }
};
