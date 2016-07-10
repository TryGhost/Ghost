// # Compare helper
// Usage:   `{{#compare "Foo" "Bar"}} --> implies "===" operator
//          `{{#compare tags.count "<=" 3}}
//
// Inspired by https://gist.github.com/pheuter/3515945#gistcomment-1378171
var errors      = require('../errors'),
    i18n        = require('../i18n'),
    compare;

compare = function (lvalue, operator, rvalue, options) {
    var operators, result;

    if (arguments.length < 3) {
        return errors.logAndThrowError(i18n.t('warnings.helpers.compare.notEnoughArgs'));
    }

    if (options === undefined) {
        options = rvalue;
        rvalue = operator;
        operator = '===';
    }

    operators = {
        '==': function (l, r) { return l === r; },
        '===': function (l, r) { return l === r; },
        '!=': function (l, r) { return l !== r; },
        '!==': function (l, r) { return l !== r; },
        '<': function (l, r) { return l < r; },
        '>': function (l, r) { return l > r; },
        '<=': function (l, r) { return l <= r; },
        '>=': function (l, r) { return l >= r; },
        typeof: function (l, r) { return typeof l === r; }
    };

    if (!operators[operator]) {
        return errors.logAndThrowError(i18n.t('warnings.helpers.compare.unknownOperator', {operator: operator}));
    }

    result = operators[operator](lvalue, rvalue);

    if (result) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
};

module.exports = compare;
