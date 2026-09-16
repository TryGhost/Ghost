/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/meta_title.js @ 407e032dc7 — transforms: imports→seam
// # Meta Title Helper
// Usage: `{{meta_title}}`
//
// Page title used for sharing and SEO
import * as metaData from '../meta/index.ts';
const { getMetaDataTitle } = metaData;

// We use the name meta_title to match the helper for consistency:
// eslint-disable-next-line camelcase
export default function meta_title(this: any, options: any) {
  return getMetaDataTitle(this, options.data.root, options);
}
