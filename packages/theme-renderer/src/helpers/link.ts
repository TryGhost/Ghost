/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/link.js @ 407e032dc7 — transforms: imports→seam
// # link helper
import {config} from '../seam/proxy.ts';
import {SafeString, localUtils} from '../seam/handlebars-env.ts';

import _ from 'lodash';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const {buildLinkClasses} = localUtils;

const messages = {
    hrefIsRequired: 'The {{#link}}{{/link}} helper requires an href="" attribute.'
};

const managedAttributes = ['href', 'class', 'activeClass', 'parentActiveClass'];

function _formatAttrs(attributes: any) {
    return Object.keys(attributes)
        // @TODO handle non-string attributes?
        .map(key => `${key}="${attributes[key]}"`)
        .join(' ');
}

export default function link(this: any, options: any) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    // If there is no href provided, this is theme dev error, so we throw an error to make this clear.
    if (!_.has(options.hash, 'href')) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.hrefIsRequired)
        });
    }
    // If the href attribute is empty, this is probably a dynamic data problem, hard for theme devs to track down
    // E.g. {{#link for=slug}}{{/link}} in a context where slug returns an empty string
    // Error's here aren't useful (same as with empty get helper filters) so we fallback gracefully
    if (!options.hash.href) {
        options.hash.href = '';
    }

    const href = options.hash.href.string || options.hash.href;

    // Calculate dynamic properties
    const classes = buildLinkClasses(config.get('url'), href, options);

    // Remove all the attributes we don't want to do a one-to-one mapping of
    managedAttributes.forEach((attr) => {
        delete options.hash[attr];
    });

    // Setup our one-to-one mapping of attributes;
    const attributes = options.hash;

    // Prepare output
    const classString = classes.length > 0 ? `class="${classes.join(' ')}"` : '';
    const hrefString = `href="${href}"`;
    const attributeString = _.size(attributes) > 0 ? _formatAttrs(attributes) : '';
    let openingTag = `<a ${classString} ${hrefString} ${attributeString}>`;
    const closingTag = `</a>`;

    // Clean up any extra spaces
    openingTag = openingTag.replace(/\s{2,}/g, ' ').replace(/\s>/, '>');

    return new SafeString(`${openingTag}${options.fn(this)}${closingTag}`);
}
