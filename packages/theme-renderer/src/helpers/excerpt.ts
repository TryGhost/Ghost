/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/excerpt.js @ 407e032dc7 — transforms: imports→seam
// # Excerpt Helper
// Usage: `{{excerpt}}`, `{{excerpt words="50"}}`, `{{excerpt characters="256"}}`
//
// Attempts to remove all HTML from the string, and then shortens the result according to the provided option.
//
// Defaults to words="50"

import {SafeString} from '../seam/handlebars-env.ts';
import * as metaData from '../meta/index.ts';
import _ from '../utils/lodash.ts';
const getMetaDataExcerpt = metaData.getMetaDataExcerpt;

export default function excerpt(this: any, options: any) {
    let truncateOptions = (options || {}).hash || {};

    let excerptText;

    if (this.custom_excerpt) {
        excerptText = String(this.custom_excerpt);
    } else if (this.excerpt) {
        excerptText = String(this.excerpt);
    } else {
        excerptText = '';
    }

    excerptText = _.escape(excerptText);

    truncateOptions = _.reduce(truncateOptions, (_truncateOptions: any, value: any, key: string) => {
        if (['words', 'characters'].includes(key)) {
            _truncateOptions[key] = parseInt(value, 10);
        }
        return _truncateOptions;
    }, {});

    // For custom excerpts, make sure we truncate them only based on length
    if (!_.isEmpty(this.custom_excerpt)) {
        truncateOptions.characters = excerptText.length; // length is expanded by use of escaped characters
        if (truncateOptions.words) {
            delete truncateOptions.words;
        }
    }

    return new SafeString(
        getMetaDataExcerpt(excerptText, truncateOptions)
    );
}
