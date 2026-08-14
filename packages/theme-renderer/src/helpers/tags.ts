/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/tags.js @ 407e032dc7 — transforms: imports→seam
// # Tags Helper
// Usage: `{{tags}}`, `{{tags separator=' - '}}`
//
// Returns a string of the tags on the post.
// By default, tags are separated by commas.
//
// Note that the standard {{#each tags}} implementation is unaffected by this helper
import {urlService} from '../seam/proxy.ts';
import {SafeString, escapeExpression, templates} from '../seam/handlebars-env.ts';

import isString from 'lodash/isString.js';
import helpers from '@tryghost/helpers';
const ghostHelperUtils = helpers.utils;

export default function tags(this: any, options: any) {
    options = options || {};
    options.hash = options.hash || {};

    const autolink = !(isString(options.hash.autolink) && options.hash.autolink === 'false');
    const separator = isString(options.hash.separator) ? options.hash.separator : ', ';
    const prefix = isString(options.hash.prefix) ? options.hash.prefix : '';
    const suffix = isString(options.hash.suffix) ? options.hash.suffix : '';
    const limit = options.hash.limit ? parseInt(options.hash.limit, 10) : undefined;
    let output: any = '';
    let from = options.hash.from ? parseInt(options.hash.from, 10) : 1;
    let to = options.hash.to ? parseInt(options.hash.to, 10) : undefined;

    function createTagList(tagsList: any) {
        function processTag(tag: any) {
            return autolink ? templates.link({
                url: urlService.getUrlForResource({...tag, type: 'tags'}, {withSubdirectory: true}),
                text: escapeExpression(tag.name)
            }) : escapeExpression(tag.name);
        }

        return ghostHelperUtils.visibility.filter(tagsList, options.hash.visibility, processTag);
    }

    if (this.tags && this.tags.length) {
        output = createTagList(this.tags);
        from -= 1; // From uses 1-indexed, but array uses 0-indexed.
        to = to || (limit as any) + from || output.length;
        output = output.slice(from, to).join(separator);
    }

    if (output) {
        output = prefix + output + suffix;
    }

    return new SafeString(output);
}
