/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/is.js @ 407e032dc7 — transforms: imports→seam
// # Is Helper
// Usage: `{{#is "paged"}}`, `{{#is "index, paged"}}`
// Checks whether we're in a given context.
import {logging} from '../seam/shared.ts';
import tpl from '@tryghost/tpl';
import _ from 'lodash';

const messages = {
    invalidAttribute: 'Invalid or no attribute given to is helper'
};

export default function is(this: any, context: any, options: any) {
    options = options || {};

    const currentContext = options.data.root.context;

    if (!_.isString(context)) {
        logging.warn(tpl(messages.invalidAttribute));
        return;
    }

    function evaluateContext(expr: string) {
        return expr.split(',').map(function (v) {
            return v.trim();
        }).reduce(function (p: boolean, c: string) {
            return p || _.includes(currentContext, c);
        }, false);
    }

    if (evaluateContext(context)) {
        return options.fn(this);
    }
    return options.inverse(this);
}
