/* eslint-disable @typescript-eslint/no-require-imports */
const debug = require('@tryghost/debug')('services:url:lazy');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const localUtils = require('../../../shared/url-utils');
const {matchPermalink} = require('./permalink-matcher');
const {buildFilter, filterMatches, routerTypeOf} = require('./router-filter');
/* eslint-enable @typescript-eslint/no-require-imports */

import type {Resource, UrlOptions, LazyUrlServiceBackend} from './url-service-facade';
import type {FindResource} from './lazy-find-resource';
import type {CompiledFilter} from './router-filter';

interface RouterConfig {
    identifier: string;
    filter: string | null;
    resourceType: string;
    permalink: string;
    // Compiled once at registration (null = unfiltered router).
    compiledFilter: CompiledFilter | null;
}

interface LazyUrlServiceDeps {
    urlUtils?: typeof localUtils;
    findResource?: FindResource | null;
}

// Migrated callers tag resources with the plural router type, but the page:
// transformer (and the eager generator) matches the singular DB `type` column.
const ROUTER_TYPE_TO_DB_TYPE: Record<string, string> = {posts: 'post', pages: 'page'};

/**
 * On-demand URL service: computes URLs and ownership per call from the
 * registered router configs instead of a precomputed map, so boot does no URL
 * work and memory stays flat. Forward lookups are pure; resolveUrl is the only
 * DB-touching path, and only via the injected `findResource` hook (so the
 * service is unit-testable without a database). Matching semantics live in the
 * permalink-matcher / router-filter helpers.
 */
export class LazyUrlService implements LazyUrlServiceBackend {
    private urlUtils: typeof localUtils;
    private findResource: FindResource | null;
    // Router configs in registration order, which is their priority.
    private routerConfigs: RouterConfig[];

    constructor({urlUtils = localUtils, findResource = null}: LazyUrlServiceDeps = {}) {
        this.urlUtils = urlUtils;
        this.findResource = findResource;
        this.routerConfigs = [];
    }

    onRouterAddedType(
        identifier: string,
        filter: string | null,
        resourceType: string,
        permalink: string
    ): void {
        debug('onRouterAddedType', identifier, resourceType, permalink, filter);
        this.routerConfigs.push({
            identifier,
            filter,
            resourceType,
            permalink,
            compiledFilter: buildFilter(filter)
        });
    }

    onRouterUpdated(): void {
        // No precomputed state to regenerate; the next request reads the
        // current config.
    }

    // Drops all registered routers; called when routes.yaml is reloaded.
    reset(): void {
        this.routerConfigs = [];
    }

    hasFinished(): boolean {
        return true;
    }

    getUrlForResource(resource: Resource, options: UrlOptions = {}): string {
        const routerType = routerTypeOf(resource);
        if (!routerType) {
            return this._formatNotFound(options);
        }
        const candidates = this.routerConfigs.filter(c => c.resourceType === routerType);
        const record = this._recordForFilter(resource);
        for (const config of candidates) {
            this._warnIfThin(config, resource, routerType);
            if (filterMatches(config.compiledFilter, record)) {
                const path = this.urlUtils.replacePermalink(config.permalink, resource);
                return this._formatPath(path, options);
            }
        }
        return this._formatNotFound(options);
    }

    ownsResource(routerIdentifier: string, resource: Resource | null): boolean {
        const config = this.routerConfigs.find(c => c.identifier === routerIdentifier);
        if (!config || !resource) {
            return false;
        }
        if (config.resourceType !== routerTypeOf(resource)) {
            return false;
        }
        return filterMatches(config.compiledFilter, this._recordForFilter(resource));
    }

    // Normalizes the plural router type ('posts'/'pages') to the singular DB
    // value ('post'/'page') for filter evaluation only, so page: filters match
    // as they do in the eager generator. Router selection uses the resource
    // as-is.
    private _recordForFilter(resource: Resource): Record<string, unknown> {
        const record = resource as Record<string, unknown>;
        const dbType = ROUTER_TYPE_TO_DB_TYPE[record.type as string];
        return dbType ? {...record, type: dbType} : record;
    }

    /**
     * Resolves a URL path to a resource: walks routers in priority order,
     * matching the permalink template, loading the record via findResource,
     * and re-checking the router's filter.
     */
    async resolveUrl(urlPath: string): Promise<Resource | null> {
        if (!this.findResource) {
            return null;
        }
        for (const config of this.routerConfigs) {
            const params = matchPermalink(config.permalink, urlPath);
            if (!params) {
                continue;
            }
            const resource = await this.findResource(config.resourceType, params);
            if (!resource) {
                continue;
            }
            // Re-check the filter so the reverse lookup can't claim a resource
            // the forward lookup would have routed elsewhere.
            if (!filterMatches(config.compiledFilter, resource)) {
                continue;
            }
            // findResource queries by slug only for the column-backed fields;
            // Bookshelf silently drops non-column captures (year/month/
            // primary_tag/...), so a slug match can come back whose other
            // segments don't line up. Accept it only when its canonical URL
            // equals the requested path, matching the eager service which
            // stores canonical URLs alone.
            if (!this._matchesCanonicalUrl(config.permalink, resource, urlPath)) {
                continue;
            }
            return Object.assign({}, resource, {type: config.resourceType}) as Resource;
        }
        return null;
    }

    private _matchesCanonicalUrl(permalink: string, resource: Record<string, unknown>, urlPath: string): boolean {
        const canonical = this.urlUtils.replacePermalink(permalink, resource);
        const strip = (p: string): string => p.replace(/^\/+|\/+$/g, '');
        return strip(canonical) === strip(urlPath);
    }

    /**
     * Warns when a caller passes a thin resource to a router whose filter
     * references a relation the resource doesn't carry — the URL would silently
     * 404, so operators can alert on the uninflated caller. tag:/author: expand
     * to tags.slug/authors.slug and need the full arrays; primary_tag:/
     * primary_author: expand to primary_*.slug and only need that computed
     * field, so they're checked separately to avoid false positives. A field
     * present but empty/null (loaded, no match) is not thin.
     */
    private _warnIfThin(config: RouterConfig, resource: Resource, routerType: string): void {
        if (!config.filter) {
            return;
        }
        const filter = config.filter;
        const r = resource as Record<string, unknown>;
        const missing: string[] = [];
        if (/\btags?\b/.test(filter) && !Array.isArray(r.tags)) {
            missing.push('tags');
        }
        if (/\bauthors?\b/.test(filter) && !Array.isArray(r.authors)) {
            missing.push('authors');
        }
        if (/\bprimary_tag\b/.test(filter) && r.primary_tag === undefined) {
            missing.push('primary_tag');
        }
        if (/\bprimary_author\b/.test(filter) && r.primary_author === undefined) {
            missing.push('primary_author');
        }
        if (missing.length === 0) {
            return;
        }
        logging.error(new errors.InternalServerError({
            message: 'Thin resource passed to LazyUrlService.getUrlForResource',
            code: 'LAZY_URL_THIN_RESOURCE',
            errorDetails: {
                resourceType: routerType,
                resourceId: resource.id,
                routerIdentifier: config.identifier,
                filter: config.filter,
                missing
            }
        }));
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

    // Mirrors the eager getUrlByResourceId miss path: unlike a resolved URL, the
    // /404/ fallback is not prefixed with the subdirectory (createUrl without
    // the third arg), so lazy and eager stay in parity on subdirectory installs.
    private _formatNotFound(options: UrlOptions): string {
        if (options.absolute) {
            return this.urlUtils.createUrl('/404/', options.absolute);
        }
        if (options.withSubdirectory) {
            return this.urlUtils.createUrl('/404/', false);
        }
        return '/404/';
    }
}

module.exports = LazyUrlService;
module.exports.LazyUrlService = LazyUrlService;
