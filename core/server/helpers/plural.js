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
    plural;

plural = function (context, options) {
    if (_.isUndefined(options.hash) || _.isUndefined(options.hash.empty) ||
        _.isUndefined(options.hash.singular) || _.isUndefined(options.hash.plural)) {
        return errors.logAndThrowError('All values must be defined for empty, singular and plural');
    }

    if (context === 0) {
        return new hbs.handlebars.SafeString(options.hash.empty.replace('%', context));
    } else if (context === 1) {
        return new hbs.handlebars.SafeString(options.hash.singular.replace('%', context));
    } else if (context >= 2) {
        return new hbs.handlebars.SafeString(options.hash.plural.replace('%', context));
    }
};

module.exports = plural;
