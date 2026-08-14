/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/routing/controllers/entry/canonical-url.ts @ 407e032dc7 —
// transforms: `node:url` format/parse → whatwg URL for the entry pathname and
// a manual search-string slice for the request (web-standard only); Express
// Request → PortRequest.
import type {PortRequest} from '../../../ports.ts';

/**
 * Build the entry's canonical URL (its own pathname) carrying over the current
 * request's query string. Shared by the permalink redirect.
 */
export default function buildCanonicalUrl(req: PortRequest, entry: any): string {
    const pathname = new URL(entry.url, 'http://relative.invalid').pathname;
    const queryIndex = req.originalUrl.indexOf('?');
    const search = queryIndex === -1 ? '' : req.originalUrl.slice(queryIndex);
    return pathname + search;
}
