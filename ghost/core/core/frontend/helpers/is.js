// # Is Helper
// Usage: `{{#is "paged"}}`, `{{#is "index, paged"}}`
// Checks whether we're in a given context.
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const _ = require('lodash');

const messages = {
    invalidAttribute: 'Invalid or no attribute given to is helper'
};

module.exports = function is(context, options) {
    options = options || {};

    const currentContext = options.data.root.context;

    if (!_.isString(context)) {
        logging.warn(tpl(messages.invalidAttribute));
        return;
    }

    function evaluateContext(expr) {
        return expr.split(',').map(function (v) {
            return v.trim();
        }).reduce(function (p, c) {
            return p || _.includes(currentContext, c);
        }, false);
    }

    if (evaluateContext(context)) {
        return options.fn(this);
    }
    return options.inverse(this);
};
