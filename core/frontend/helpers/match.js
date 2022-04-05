const {SafeString} = require('../services/handlebars');

const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

const _ = require('lodash');

const messages = {
    invalidAttribute: 'Invalid or no attribute given to match helper'
};

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
    case '<':
        result = data < value;
        break;
    case '>':
        result = data > value;
        break;
    case '>=':
        result = data >= value;
        break;
    case '<=':
        result = data <= value;
        break;
    default:
        result = data === value;
    }

    return result;
};

module.exports = function match(...attrs) {
    // options = options || {};
    // options.hash = options.hash || {};
    // options.data = options.data || {};

    const options = attrs.pop();
    const isBlock = _.has(options, 'fn');
    let result;

    if (_.isEmpty(attrs)) {
        logging.warn(tpl(messages.invalidAttribute));
        return;
    }

    // If any of the attributes are safe strings, change them back to their original value
    attrs = attrs.map((attr) => {
        if (attr instanceof SafeString) {
            return attr.string;
        }

        return attr;
    });

    if (attrs.length === 1) {
        // CASE: single attribute, treat it as simple true/false (like the if helper)
        result = handleConditional(attrs[0], options);
    } else if (attrs.length === 2) {
        // CASE: two attributes, assume the operator is "="
        result = handleMatch(attrs[0], '=', attrs[1]);
    } else if (attrs.length === 3) {
        // CASE: three attributes, handle the match exactly
        result = handleMatch(attrs[0], attrs[1], attrs[2]);
    } else {
        logging.warn(tpl(messages.invalidAttribute));
        return;
    }

    // If we're in block mode, return the outcome from the fn/inverse functions
    if (isBlock) {
        if (result) {
            return options.fn(this);
        }

        return options.inverse(this);
    }

    // Else return the result as a SafeString Eg.{string: false} || {string: true}
    return new SafeString(result);
};
