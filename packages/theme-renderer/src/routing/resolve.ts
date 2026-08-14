/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal route resolver — fresh code (slice 1).
 *
 * Implements default routes.yaml semantics only, mirroring the mount order the
 * RouterManager produces for the default config (extraction-map §8:
 * Collections → StaticPages → Taxonomies):
 *
 *   /                     → collection index controller
 *   /page/:page/          → collection index controller (paged)
 *   /:slug/[edit/]        → entry controller for posts (collection permalink),
 *                           then fall through to static pages
 *                           (`resourceType: 'pages'`) when the post lookup
 *                           finds nothing — Express mount-order fall-through
 *                           becomes an ordered candidate list.
 *   /tag/:slug/[page/:page/ | edit/]    → channel controller (tag taxonomy)
 *   /author/:slug/[page/:page/ | edit/] → channel controller (author taxonomy)
 *
 * The routerOptions shapes are copied from collection-router.js
 * `_prepareEntriesContext`/`_prepareEntryContext`, static-pages-router.js
 * `_prepareContext` and taxonomy-router.js `_prepareContext` @ 407e032dc7.
 * Later work replaces this module with the full lazy-matcher integration
 * (routes.yaml parsing, custom collections/taxonomies).
 */
import matchPermalinkParams from '../data/match-permalink-params.ts';
import {toExpressNotation} from './permalink-adapter.ts';
import {QUERY, TAXONOMIES} from './config.ts';
import {config, urlUtils} from '../seam/proxy.ts';
import type {RouterOptions} from '../ports.ts';

export type RouteCandidate =
    | {
        controller: 'collection' | 'channel' | 'entry';
        params: Record<string, any>;
        routerOptions: RouterOptions;
    }
    | {
        /**
         * Resolver-level redirect. 301: the page-param middleware's page-1
         * alias — `url` is site-relative and subdir-stripped (the assembly
         * re-prefixes the subdir, appends the query string, and adds the
         * permanent-redirect Cache-Control). 302: the taxonomy /edit admin
         * redirect — `url` is absolute (urlUtils.redirectToAdmin semantics:
         * no subdir prefixing, no query, no cache header).
         */
        controller: 'redirect';
        redirect: {status: 301; url: string} | {status: 302; url: string; absolute: true};
    };

export interface ResolveRoutesOptions {
    /** Collection permalink in domain notation, default '/{slug}/' */
    permalink?: string;
}

const PAGE_PATTERN = /^\/page\/(\d+)\/$/;

// default-routes.yaml taxonomies (domain notation)
const TAXONOMY_PERMALINKS: Record<keyof typeof TAXONOMIES, string> = {
    tag: '/tag/{slug}/',
    author: '/author/{slug}/'
};

// collection-router.js: permalinks.getValue({withUrlOptions: true}) —
// urlJoin(permalink, '/:options(edit)?/')
function withUrlOptions(permalink: string): string {
    return permalink.replace(/\/$/, '') + '/:options(edit)?/';
}

// collection-router.js:_prepareEntriesContext for the default '/' collection
function collectionRouterOptions(permalinks: string): RouterOptions {
    return {
        type: 'collection',
        filter: undefined,
        limit: undefined,
        order: undefined,
        permalinks,
        resourceType: 'posts',
        query: QUERY.post,
        context: ['index'],
        frontPageTemplate: 'home',
        templates: [],
        identifier: 'default-collection-index',
        name: 'index',
        data: {}
    };
}

export function resolveRoutes(path: string, options: ResolveRoutesOptions = {}): RouteCandidate[] {
    const permalinks = withUrlOptions(toExpressNotation(options.permalink ?? '/{slug}/'));
    const candidates: RouteCandidate[] = [];

    // Mount: collection index route '/'
    if (path === '/') {
        candidates.push({
            controller: 'collection',
            params: {},
            routerOptions: collectionRouterOptions(permalinks)
        });
        return candidates;
    }

    // Mount: collection pagination '/page/:page(\d+)/'
    const pageMatch = path.match(PAGE_PATTERN);
    if (pageMatch) {
        // page-param middleware (routing/middleware/page-param.js):
        // routeKeywords.page: 'page'
        const pageRegex = new RegExp('/page/(.*)?/');
        const page = parseInt(pageMatch[1]!, 10);

        if (page === 1) {
            // CASE: page 1 is an alias for the collection index, do a permanent 301 redirect
            candidates.push({
                controller: 'redirect',
                redirect: {status: 301, url: path.replace(pageRegex, '/')}
            });
            return candidates;
        }

        if (page < 1 || isNaN(page)) {
            // CASE: page-param next(NotFoundError) — no candidates → 404
            // (page 0 is the only reachable case behind \d+)
            return candidates;
        }

        candidates.push({
            controller: 'collection',
            params: {page},
            routerOptions: collectionRouterOptions(permalinks)
        });
        // NOTE: '/page/2/' cannot also match the entry permalink
        // ('/page/:options(edit)?/' requires options === 'edit'), matching
        // Express behavior — no entry candidates added.
        return candidates;
    }

    // Mount: collection entry permalink '/:slug/:options(edit)?/'
    const entryParams = matchPermalinkParams(permalinks, path);
    if (entryParams !== false) {
        // collection-router.js:_prepareEntryContext mutates the collection
        // routerOptions to {context: ['post'], type: 'entry'}
        candidates.push({
            controller: 'entry',
            params: entryParams,
            routerOptions: {
                ...collectionRouterOptions(permalinks),
                context: ['post'],
                type: 'entry'
            }
        });
    }

    // Mount: static pages '/:slug/:options(edit)?/' (always after collections)
    const staticPagesPermalinks = withUrlOptions('/:slug/');
    const pageParams = matchPermalinkParams(staticPagesPermalinks, path);
    if (pageParams !== false) {
        // static-pages-router.js:_prepareContext
        candidates.push({
            controller: 'entry',
            params: pageParams,
            routerOptions: {
                type: 'entry',
                permalinks: staticPagesPermalinks,
                resourceType: 'pages',
                query: QUERY.page,
                context: ['page']
            }
        });
    }

    // Mount: taxonomies (after static pages; default-routes.yaml tag+author).
    // taxonomy-router.js mounts, in order: RSS (out of package scope —
    // extraction-map §(a)), the channel route, pagination, and the /edit
    // admin redirect.
    for (const key of Object.keys(TAXONOMY_PERMALINKS) as Array<keyof typeof TAXONOMY_PERMALINKS>) {
        const taxonomyPermalinks = toExpressNotation(TAXONOMY_PERMALINKS[key]);

        // taxonomy-router.js:_prepareContext
        const taxonomyRouterOptions = (): RouterOptions => ({
            type: 'channel',
            name: key,
            permalinks: taxonomyPermalinks,
            // Route data in domain form — the API adapter resolves it to a
            // controller call, and fetch-data fills `%s` in from the request.
            data: {[key]: {type: 'read', resource: TAXONOMIES[key].resource, slug: '%s'}},
            filter: TAXONOMIES[key].filter,
            resourceType: TAXONOMIES[key].resource,
            context: [key],
            slugTemplate: true,
            identifier: `taxonomy-${key}`
        });

        // e.g. /tag/:slug/
        const channelParams = matchPermalinkParams(taxonomyPermalinks, path);
        if (channelParams !== false) {
            candidates.push({
                controller: 'channel',
                params: channelParams,
                routerOptions: taxonomyRouterOptions()
            });
        }

        // pagination: e.g. /tag/:slug/page/:page(\d+)/ (page-param middleware
        // applies — page 1 is a permanent-redirect alias for the channel index)
        const taxonomyPageParams = matchPermalinkParams(
            taxonomyPermalinks.replace(/\/$/, '') + '/page/:page(\\d+)/',
            path
        );
        if (taxonomyPageParams !== false) {
            const page = parseInt(taxonomyPageParams.page, 10);
            if (page === 1) {
                candidates.push({
                    controller: 'redirect',
                    redirect: {status: 301, url: path.replace(new RegExp('/page/(.*)?/'), '/')}
                });
            } else {
                candidates.push({
                    controller: 'channel',
                    params: {...taxonomyPageParams, page},
                    routerOptions: taxonomyRouterOptions()
                });
            }
        }

        // edit redirect: e.g. /tag/:slug/edit/ → admin, when admin:redirects
        // is enabled (taxonomy-router.js:_redirectEditOption —
        // urlUtils.redirectToAdmin(302, res, editRedirect) builds
        // urlJoin(urlFor('admin', true), path, '/') and 302-redirects)
        const editParams = matchPermalinkParams(
            taxonomyPermalinks.replace(/\/$/, '') + '/edit/',
            path
        );
        if (editParams !== false && config.get('admin:redirects')) {
            candidates.push({
                controller: 'redirect',
                redirect: {
                    status: 302,
                    url: urlUtils.urlJoin(
                        urlUtils.urlFor('admin' as any, true),
                        TAXONOMIES[key].editRedirect.replace(':slug', editParams.slug),
                        '/'
                    ),
                    absolute: true
                }
            });
        }
    }

    return candidates;
}
