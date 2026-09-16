/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/page_url.js @ 407e032dc7 — transforms: imports→seam
// ### Page URL Helper
//
// *Usage example:*
// `{{page_url 2}}`
//
// Returns the URL for the page specified in the current object context.
import * as metaData from '../meta/index.ts';
const getPaginatedUrl = metaData.getPaginatedUrl;

// We use the name page_url to match the helper for consistency:
// eslint-disable-next-line camelcase
export default function page_url(page: any, options?: any) {
  if (!options) {
    options = page;
    page = 1;
  }
  return getPaginatedUrl(page, options.data.root);
}
