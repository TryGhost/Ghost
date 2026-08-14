/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal route resolver — fresh code (slice 1).
 *
 * Implements default routes.yaml semantics only, mirroring the mount order the
 * RouterManager produces for the default config (extraction-map §8:
 * Collections → StaticPages):
 *
 *   /                → collection index controller
 *   /page/:page/     → collection index controller (paged)
 *   /:slug/[edit/]   → entry controller for posts (collection permalink), then
 *                      fall through to static pages (`resourceType: 'pages'`)
 *                      when the post lookup finds nothing — Express mount-order
 *                      fall-through becomes an ordered candidate list.
 *
 * The routerOptions shapes are copied from collection-router.js
 * `_prepareEntriesContext`/`_prepareEntryContext` and static-pages-router.js
 * `_prepareContext` @ 407e032dc7. The parity slice replaces this module with
 * the full lazy-matcher integration (routes.yaml parsing, taxonomies, custom
 * collections).
 */
import matchPermalinkParams from '../data/match-permalink-params.ts';
import {toExpressNotation} from './permalink-adapter.ts';
import {QUERY} from './config.ts';
import type {RouterOptions} from '../ports.ts';

export type RouteCandidate =
    | {
        controller: 'collection' | 'entry';
        params: Record<string, any>;
        routerOptions: RouterOptions;
    }
    | {
        /**
         * Resolver-level permanent redirect (the page-param middleware's
         * page-1 alias). `url` is site-relative and subdir-stripped — the
         * assembly re-prefixes the subdir and appends the query string.
         */
        controller: 'redirect';
        redirect: {status: 301; url: string};
    };

export interface ResolveRoutesOptions {
    /** Collection permalink in domain notation, default '/{slug}/' */
    permalink?: string;
}

const PAGE_PATTERN = /^\/page\/(\d+)\/$/;

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

    return candidates;
}
