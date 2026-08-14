/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/meta_description.js @ 407e032dc7 — transforms: imports→seam
// # Meta Description Helper
// Usage: `{{meta_description}}`
//
// Page description used for sharing and SEO
import * as metaData from '../meta/index.ts';
const {getMetaDataDescription} = metaData;

// We use the name meta_description to match the helper for consistency:
export default function meta_description(this: any, options: any) { // eslint-disable-line camelcase
    options = options || {};

    return getMetaDataDescription(this, options.data.root) || '';
}
