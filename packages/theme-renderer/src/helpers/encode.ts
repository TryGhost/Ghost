/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/encode.js @ 407e032dc7 — transforms: imports→seam
// # Encode Helper
//
// Usage:  `{{encode uri}}`
//
// Returns URI encoded string

import {SafeString} from '../seam/handlebars-env.ts';

export default function encode(string: any, options: any) {
    const uri = string || options;
    return new SafeString(encodeURIComponent(uri));
}
