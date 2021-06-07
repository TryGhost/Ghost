const {logging, i18n, SafeString, labs} = require('../services/proxy');
const _ = require('lodash');

/**
 * This is identical to the built-in if helper
 */
const handleConditional = (conditional, options) => {
    if (_.isFunction(conditional)) {
        conditional = conditional.call(this);
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || _.isEmpty(conditional)) {
        return true;
    } else {
        return false;
    }
};

const handleMatch = (data, operator, value) => {
    let result;

    switch (operator) {
    case '!=':
        result = data !== value;
        break;
    default:
        result = data === value;
    }

    return result;
};

function match(...attrs) {
    // options = options || {};
    // options.hash = options.hash || {};
    // options.data = options.data || {};

    const options = attrs.pop();
    const isBlock = _.has(options, 'fn');
    let result;

    if (_.isEmpty(attrs)) {
        logging.warn(i18n.t('warnings.helpers.has.invalidAttribute'));
        return;
    }

    if (attrs.length === 1) {
        // If we only have one attribute, treat it as simple true/false (like the if helper)
        result = handleConditional(attrs[0], options);
    } else if (attrs.length === 3) {
        result = handleMatch(attrs[0], attrs[1], attrs[2], options);
    } else {
        logging.warn(i18n.t('warnings.helpers.has.invalidAttribute'));
        return;
    }

    // If we're in block mode, return the outcome from the fn/inverse functions
    if (isBlock) {
        if (result) {
            return options.fn(this);
        }

        return options.inverse(this);
    }

    // Else return the result as a string
    return new SafeString(result);
}

module.exports = function matchLabsWrapper() {
    let self = this;
    let args = arguments;

    return labs.enabledHelper({
        flagKey: 'matchHelper',
        flagName: 'Match helper',
        helperName: 'match',
        helpUrl: 'https://ghost.org/docs/themes/'
    }, () => {
        return match.apply(self, args);
    });
};
