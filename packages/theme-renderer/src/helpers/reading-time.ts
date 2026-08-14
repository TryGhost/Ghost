/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias */
// Copied from ghost/core/core/frontend/helpers/reading_time.js @ 407e032dc7 — transforms: imports→seam
// # Reading Time Helper
//
// Usage:  `{{reading_time}}`
// or for translatable themes, with (t) translation helper's subexpressions:
// `{{reading_time seconds=(t "< 1 min read") minute=(t "1 min read") minutes=(t "% min read")}}`
// and in the theme translation file, for example Spanish es.json:
// "< 1 min read": "< 1 min de lectura",
// "1 min read": "1 min de lectura",
// "% min read": "% min de lectura",
//
// Returns estimated reading time for post

import {checks} from '../seam/data.ts';
import {SafeString} from '../seam/handlebars-env.ts';

import * as helpers from '@tryghost/helpers';
const {readingTime: calculateAndFormatReadingTime} = helpers;

export default function reading_time(this: any, options: any) {// eslint-disable-line camelcase
    options = options || {};
    options.hash = options.hash || {};
    const possiblyPost = this;

    // only calculate reading time for posts
    if (!checks.isPost(possiblyPost)) {
        return null;
    }

    const readingTime = calculateAndFormatReadingTime(possiblyPost, options.hash);
    return new SafeString(readingTime);
}
