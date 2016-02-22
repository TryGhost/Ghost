// # Plural Helper
// Usage: `{{plural 0 empty='No posts' singular='% post' plural='% posts'}}`
//
// pluralises strings depending on item count
//
// The 1st argument is the numeric variable which the helper operates on
// The 2nd argument is the string that will be output if the variable's value is 0
// The 3rd argument is the string that will be output if the variable's value is 1
// The 4th argument is the string that will be output if the variable's value is 2+

var hbs             = require('express-hbs'),
    errors          = require('../errors'),
    _               = require('lodash'),
    i18n            = require('../i18n'),
    plural;

plural = function (number, options) {
    if (_.isUndefined(options.hash) || _.isUndefined(options.hash.empty) ||
        _.isUndefined(options.hash.singular) || _.isUndefined(options.hash.plural)) {
        return errors.logAndThrowError(i18n.t('warnings.helpers.plural.valuesMustBeDefined'));
    }

    if (number === 0) {
        return new hbs.handlebars.SafeString(options.hash.empty.replace('%', number));
    } else if (number === 1) {
        return new hbs.handlebars.SafeString(options.hash.singular.replace('%', number));
    } else if (number >= 2) {
        return new hbs.handlebars.SafeString(options.hash.plural.replace('%', number));
    }
};

module.exports = plural;
