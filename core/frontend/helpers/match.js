const {logging, i18n, SafeString, labs} = require('../services/proxy');
const _ = require('lodash');

/**
 * This is identical to the built-in if helper, except inverse/fn calls are replaced with false/true
 * https://github.com/handlebars-lang/handlebars.js/blob/19bdace85a8d0bc5ed3a4dec4071cb08c8d003f2/lib/handlebars/helpers/if.js#L9-L20
 */
function isEmptyValue(value) {
    if (!value && value !== 0) {
        return true;
    } else if (Array.isArray(value) && value.length === 0) {
        return true;
    } else {
        return false;
    }
}

const handleConditional = (conditional, options) => {
    if (_.isFunction(conditional)) {
        conditional = conditional.call(this);
    }

    if (conditional instanceof SafeString) {
        conditional = conditional.string;
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || isEmptyValue(conditional)) {
        return false;
    } else {
        return true;
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
