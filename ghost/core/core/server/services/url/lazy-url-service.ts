/* eslint-disable @typescript-eslint/no-require-imports */
const nql = require('@tryghost/nql');
const debug = require('@tryghost/debug')('services:url:lazy');
const localUtils = require('../../../shared/url-utils');
/* eslint-enable @typescript-eslint/no-require-imports */

import type {Resource, UrlOptions, LazyUrlServiceBackend} from './url-service-facade';

// The same expansions used by UrlGenerator so users can write `tag:foo`,
// `author:jane`, etc. and have them rewritten to the underlying field paths.
const EXPANSIONS = [
    {key: 'author', replacement: 'authors.slug'},
    {key: 'tags', replacement: 'tags.slug'},
    {key: 'tag', replacement: 'tags.slug'},
    {key: 'authors', replacement: 'authors.slug'},
    {key: 'primary_tag', replacement: 'primary_tag.slug'},
    {key: 'primary_author', replacement: 'primary_author.slug'}
];

// Same `page:true/false` legacy transformer the UrlGenerator uses, so old
// routes.yaml configs continue to work.
const PAGE_TRANSFORMER = nql.utils.mapKeyValues({
    key: {from: 'page', to: 'type'},
    values: [
        {from: false, to: 'post'},
        {from: true, to: 'page'}
    ]
});

// Map a resource's `type` field (whatever the caller passed) onto the plural
// router resource type. We accept the singular DB column values ('post',
// 'page') as well as the plural router keys, because the migrated callers
// are inconsistent: API responses spread `attrs` (singular), but some
// helpers explicitly tag with the plural router key.
const TYPE_TO_ROUTER_TYPE: Record<string, string> = {
    post: 'posts',
    posts: 'posts',
    page: 'pages',
    pages: 'pages',
    tag: 'tags',
    tags: 'tags',
    author: 'authors',
    authors: 'authors'
};

interface NqlInstance {
    queryJSON(record: Record<string, unknown>): unknown;
}

interface RouterConfig {
    identifier: string;
    filter: string | null;
    resourceType: string;
    permalink: string;
    nql: NqlInstance | null;
}

/**
 * Async function that resolves a slug (or other params) to a database
 * record. Injected so the URL service stays pure for forward lookups —
 * only `resolveUrl` actually hits the DB, and only via this hook.
 */
export type FindResource = (
    routerType: string,
    params: Record<string, string>
) => Promise<Record<string, unknown> | null>;

interface LazyUrlServiceDeps {
    urlUtils?: typeof localUtils;
    findResource?: FindResource | null;
}

/**
 * On-demand URL service. Computes URLs and ownership per-call from the
 * registered router configs instead of holding a precomputed map of every
 * resource. Pure for forward lookups; resolveUrl() takes an optional DB
 * lookup function so reverse lookups stay testable.
 */
export class LazyUrlService implements LazyUrlServiceBackend {
    private urlUtils: typeof localUtils;
    private findResource: FindResource | null;
    private routerConfigs: RouterConfig[];

    constructor({urlUtils = localUtils, findResource = null}: LazyUrlServiceDeps = {}) {
        this.urlUtils = urlUtils;
        this.findResource = findResource;
        // Router configs in priority order. Position is the registration order.
        this.routerConfigs = [];
    }

    onRouterAddedType(
        identifier: string,
        filter: string | null,
        resourceType: string,
        permalink: string
    ): void {
        debug('onRouterAddedType', identifier, resourceType, permalink, filter);
        const config: RouterConfig = {identifier, filter, resourceType, permalink, nql: null};
        if (filter) {
            config.nql = nql(filter, {expansions: EXPANSIONS, transformer: PAGE_TRANSFORMER});
        }
        this.routerConfigs.push(config);
    }

    onRouterUpdated(): void {
        // No state to regenerate. The next URL request reads the (possibly new)
        // router config; in-flight requests that already snapshotted the old
        // config keep using it, which matches the documented atomic-reload
        // behaviour.
    }

    /**
     * Drop all registered routers. Called when routes.yaml is reloaded.
     */
    reset(): void {
        this.routerConfigs = [];
    }

    hasFinished(): boolean {
        return true;
    }

    getUrlForResource(resource: Resource, options: UrlOptions = {}): string {
        const routerType = this._routerTypeOf(resource);
        if (!routerType) {
            return this._formatPath('/404/', options);
        }
        const candidates = this.routerConfigs.filter(c => c.resourceType === routerType);
        for (const config of candidates) {
            // NQL filters are evaluated against the original resource (with
            // its singular DB `type` field intact) because the page:true/false
            // transformer rewrites to type:'post'/'page'.
            if (this._matchesFilter(config, resource)) {
                const path = this.urlUtils.replacePermalink(config.permalink, resource);
                return this._formatPath(path, options);
            }
        }
        return this._formatPath('/404/', options);
    }

    ownsResource(routerIdentifier: string, resource: Resource | null): boolean {
        const config = this.routerConfigs.find(c => c.identifier === routerIdentifier);
        if (!config || !resource) {
            return false;
        }
        const routerType = this._routerTypeOf(resource);
        if (config.resourceType !== routerType) {
            return false;
        }
        return this._matchesFilter(config, resource);
    }

    /**
     * Translate the resource's `type` field into the plural router resource
     * type (`'posts'` / `'pages'` / `'tags'` / `'authors'`). Returns `null`
     * when the type is missing or unrecognised.
     */
    private _routerTypeOf(resource: Resource | null | undefined): string | null {
        if (!resource || !resource.type) {
            return null;
        }
        return TYPE_TO_ROUTER_TYPE[resource.type] || null;
    }

    /**
     * Resolve a URL path to a resource record. Iterates router configs in
     * priority order, pattern-matching the path against each permalink
     * template, querying the database for a matching resource, and verifying
     * any NQL filter still matches for posts.
     */
    async resolveUrl(urlPath: string): Promise<Resource | null> {
        if (!this.findResource) {
            return null;
        }
        for (const config of this.routerConfigs) {
            const params = this._matchPermalink(config.permalink, urlPath);
            if (!params) {
                continue;
            }
            const resource = await this.findResource(config.resourceType, params);
            if (!resource) {
                continue;
            }
            // For posts/pages with NQL filters, confirm the DB record still
            // satisfies the filter. The match runs against the raw record
            // (with its singular `type` column) because the page:true/false
            // transformer rewrites to type:'post'/'page'.
            if (config.nql && !this._matchesFilter(config, resource)) {
                continue;
            }
            return Object.assign({}, resource, {type: config.resourceType}) as Resource;
        }
        return null;
    }

    private _matchesFilter(config: RouterConfig, resource: Record<string, unknown>): boolean {
        if (!config.nql) {
            return true;
        }
        try {
            return !!config.nql.queryJSON(resource);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            debug('NQL match failed', config.filter, message);
            return false;
        }
    }

    private _formatPath(path: string, options: UrlOptions): string {
        if (options.absolute) {
            return this.urlUtils.createUrl(path, options.absolute);
        }
        if (options.withSubdirectory) {
            return this.urlUtils.createUrl(path, false, true);
        }
        return path;
    }

    /**
     * Match a Ghost permalink template (e.g. `/:slug/`,
     * `/:year/:month/:slug/`) against a URL path and extract the named
     * fields. Ghost's RouteSettings validator rewrites `{field}` placeholders
     * into `:field` form before they reach the URL service, so this parser
     * works on the `:field` syntax.
     *
     * Implementation: walk the permalink and path one segment at a time.
     * Each segment must be either a literal match or a single placeholder.
     * Mixing literals and placeholders inside a segment is unsupported and
     * not a documented Ghost feature; rejecting it here also keeps us out of
     * regex-backtracking territory entirely.
     */
    private _matchPermalink(permalink: string, urlPath: string): Record<string, string> | null {
        if (typeof permalink !== 'string' || typeof urlPath !== 'string') {
            return null;
        }
        const permalinkSegments = permalink.split('/');
        const pathSegments = urlPath.split('/');
        if (permalinkSegments.length !== pathSegments.length) {
            return null;
        }
        const params: Record<string, string> = {};
        for (let i = 0; i < permalinkSegments.length; i += 1) {
            const templateSegment = permalinkSegments[i];
            const pathSegment = pathSegments[i];
            if (templateSegment.startsWith(':')) {
                const fieldName = templateSegment.slice(1);
                if (!/^\w+$/.test(fieldName) || pathSegment.length === 0) {
                    return null;
                }
                try {
                    params[fieldName] = decodeURIComponent(pathSegment);
                } catch {
                    // Malformed %-escapes (e.g. "/foo%ZZ/") throw URIError;
                    // treat as a non-match rather than crash the request.
                    return null;
                }
            } else if (templateSegment !== pathSegment) {
                return null;
            }
        }
        return params;
    }
}

module.exports = LazyUrlService;
