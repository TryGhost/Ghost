/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Slice-1 urlService port.
 *
 * The frontend's resource→URL calls (meta/url.js, meta/author-url.js,
 * helpers/tags.js, helpers/authors.js) go through
 * `urlService.getUrlForResource(resource, {absolute, withSubdirectory})`.
 * The serializer-attached `resource.url` is authoritative on every Content API
 * payload (extraction-map §4), so this implementation prefers it and converts
 * absolute⇄relative via urlUtils as requested. The full lazy permalink-matcher
 * port (matching a resource against registered router configs) is the parity
 * slice's job — documented in docs/provenance.md.
 *
 * `ownsResource` returns true: with a single default collection the
 * router-filter check always owns published posts; revisit alongside the
 * matcher port.
 */
import type {UrlServicePort, UrlUtilsPort} from './types.ts';

export function createUrlService(urlUtils: UrlUtilsPort): UrlServicePort {
    return {
        getUrlForResource(resource: any, options: {absolute?: boolean; withSubdirectory?: boolean} = {}) {
            const attachedUrl = typeof resource?.url === 'string' ? resource.url : null;

            if (!attachedUrl) {
                // Mirrors LazyUrlService behavior for unroutable resources
                return '/404/';
            }

            if (options.absolute) {
                return urlUtils.relativeToAbsolute(attachedUrl);
            }

            // withSubdirectory: keep the subdir prefix; the real service
            // returns the bare path unless withSubdirectory is passed.
            return urlUtils.absoluteToRelative(attachedUrl, {
                withoutSubdirectory: !options.withSubdirectory
            });
        },
        ownsResource() {
            return true;
        }
    };
}
