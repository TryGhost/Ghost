/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/tiers.js @ 407e032dc7 — transforms: imports→seam
// # Tiers Helper
// Usage: `{{tiers}}`, `{{tiers separator=' - ' prefix=' : ' suffix=''}}`
//
// Returns a string of the tiers with access to the post.
// By default, tiers are separated by commas.
import {SafeString, escapeExpression} from '../seam/handlebars-env.ts';

import isString from 'lodash/isString.js';

export default function tiers(this: any, options: any = {}) {
    options = options || {};
    options.hash = options.hash || {};

    const separator = isString(options.hash.separator) ? options.hash.separator : ', ';
    const lastSeparator = isString(options.hash.lastSeparator) ? options.hash.lastSeparator : ' and ';
    const prefix = isString(options.hash.prefix) ? options.hash.prefix : '';
    let suffix = isString(options.hash.suffix) ? options.hash.suffix : '';

    let output = '';

    const accessProductsList = this.tiers;

    if (accessProductsList && accessProductsList.length > 0) {
        const tierNames = accessProductsList.map((tier: any) => {
            return escapeExpression(tier.name);
        });

        if (tierNames.length === 1) {
            output = tierNames[0];
            suffix = isString(options.hash.suffix) ? options.hash.suffix : ' tier';
        } else {
            suffix = isString(options.hash.suffix) ? options.hash.suffix : ' tiers';
            const firsts = tierNames.slice(0, tierNames.length - 1);
            const last = tierNames[tierNames.length - 1];
            output = firsts.join(separator) + lastSeparator + last;
        }
    }

    if (output) {
        output = prefix + output + suffix;
    }

    return new SafeString(output);
}
