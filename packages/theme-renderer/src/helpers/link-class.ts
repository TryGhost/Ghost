/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/link_class.js @ 407e032dc7 — transforms: imports→seam
// # link_class helper
import {config} from '../seam/proxy.ts';
import {SafeString, localUtils} from '../seam/handlebars-env.ts';

import _ from '../utils/lodash.ts';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const {buildLinkClasses} = localUtils;

const messages = {
    forIsRequired: 'The {{link_class}} helper requires a for="" attribute.'
};

export default function link_class(options: any) { // eslint-disable-line camelcase
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    // If there is no for provided, this is theme dev error, so we throw an error to make this clear.
    if (!_.has(options.hash, 'for')) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.forIsRequired)
        });
    }

    // If the for attribute is present but empty, this is probably a dynamic data problem, hard for theme devs to track down
    // E.g. {{link_class for=slug}} in a context where slug returns an empty string
    // Error's here aren't useful (same as with empty get helper filters) so we fallback gracefully
    if (!options.hash.for || options.hash.for.string === '') {
        options.hash.for = '';
    }

    const href = options.hash.for.string || options.hash.for;
    const classes = buildLinkClasses(config.get('url'), href, options);

    return new SafeString(classes.join(' '));
}
