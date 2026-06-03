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
    compiledFilter: CompiledFilter | null;
}

interface LazyUrlServiceDeps {
    urlUtils?: typeof localUtils;
    findResource?: FindResource | null;
}

const ROUTER_TYPE_TO_DB_TYPE: Record<string, string> = {posts: 'post', pages: 'page'};

/**
 * On-demand replacement for the eager UrlService: computes URLs and ownership
 * per call from the registered router configs instead of precomputing a full
 * map at boot. Forward lookups are pure; resolveUrl is the only DB-touching
 * path, and only through the injected findResource hook.
 */
export class LazyUrlService implements LazyUrlServiceBackend {
    private urlUtils: typeof localUtils;
    private findResource: FindResource | null;
    // Router configs in registration order, which is also their priority.
    private routerConfigs: RouterConfig[];

    constructor({urlUtils = localUtils, findResource = null}: LazyUrlServiceDeps = {}) {
        this.urlUtils = urlUtils;
        this.findResource = findResource;
        this.routerConfigs = [];
    }

    onRouterAddedType(identifier: string, filter: string | null, resourceType: string, permalink: string): void {
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
        // No precomputed state to regenerate.
    }

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

        const record = this._recordForFilter(resource);
        for (const config of this.routerConfigs) {
            if (config.resourceType !== routerType) {
                continue;
            }
            this._warnIfThin(config, resource, routerType);
            if (filterMatches(config.compiledFilter, record)) {
                const path = this.urlUtils.replacePermalink(config.permalink, resource);
                return this._formatPath(path, options);
            }
        }
        return this._formatNotFound(options);
    }

    ownsResource(routerIdentifier: string, resource: Resource | null): boolean {
        if (!resource) {
            return false;
        }
        const routerType = routerTypeOf(resource);
        if (!routerType) {
            return false;
        }
        // Ownership is exclusive: only the first matching router of the type
        // owns the resource, matching eager's reservation.
        const record = this._recordForFilter(resource);
        const owner = this.routerConfigs.find(
            c => c.resourceType === routerType && filterMatches(c.compiledFilter, record)
        );
        return !!owner && owner.identifier === routerIdentifier;
    }

    async resolveUrl(urlPath: string): Promise<Resource | null> {
        if (!this.findResource) {
            return null;
        }
        // Memoize per call so routers sharing a resourceType+permalink shape (or
        // fallthrough across filters) don't repeat the same DB lookup.
        const lookupCache = new Map<string, Record<string, unknown> | null>();
        for (const config of this.routerConfigs) {
            const params = matchPermalink(config.permalink, urlPath);
            if (!params) {
                continue;
            }
            const cacheKey = `${config.resourceType}:${JSON.stringify(params)}`;
            let resource: Record<string, unknown> | null;
            if (lookupCache.has(cacheKey)) {
                resource = lookupCache.get(cacheKey) ?? null;
            } else {
                resource = await this.findResource(config.resourceType, params);
                lookupCache.set(cacheKey, resource);
            }
            if (!resource) {
                continue;
            }
            if (!filterMatches(config.compiledFilter, resource)) {
                continue;
            }
            if (!this._matchesCanonicalUrl(config, params, resource)) {
                continue;
            }
            return Object.assign({}, resource, {type: config.resourceType}) as Resource;
        }
        return null;
    }

    // Eager only resolves a URL that equals a resource's generated (canonical)
    // URL, so we regenerate the record's URL for this permalink and confirm the
    // captured params match it. Without this, derived/relation segments the
    // query can't filter on (year/month, primary_tag) would resolve any slug,
    // 200-ing a URL the eager service 404s.
    private _matchesCanonicalUrl(config: RouterConfig, params: Record<string, string>, resource: Record<string, unknown>): boolean {
        const canonicalPath = this.urlUtils.replacePermalink(config.permalink, resource);
        const canonicalParams = matchPermalink(config.permalink, canonicalPath);
        if (!canonicalParams) {
            return false;
        }
        return Object.keys(params).every(key => canonicalParams[key] === params[key]);
    }

    // Normalizes the plural router type to the singular DB value for filter
    // evaluation only, so page: filters match as in the eager generator.
    private _recordForFilter(resource: Resource): Record<string, unknown> {
        const record = resource as Record<string, unknown>;
        const dbType = ROUTER_TYPE_TO_DB_TYPE[record.type as string];
        return dbType ? {...record, type: dbType} : record;
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

    // Mirrors the eager miss path: the /404/ fallback carries no subdirectory.
    private _formatNotFound(options: UrlOptions): string {
        if (options.absolute) {
            return this.urlUtils.createUrl('/404/', options.absolute);
        }
        if (options.withSubdirectory) {
            return this.urlUtils.createUrl('/404/', false);
        }
        return '/404/';
    }

    // Warns when a filtered router can't see a relation the caller didn't load:
    // lazy would 404 here while eager (full data in memory) returns a URL.
    private _warnIfThin(config: RouterConfig, resource: Resource, routerType: string): void {
        if (!config.filter) {
            return;
        }
        const r = resource as Record<string, unknown>;
        const missing: string[] = [];
        if (/\btags?\b/.test(config.filter) && !Array.isArray(r.tags)) {
            missing.push('tags');
        }
        if (/\bauthors?\b/.test(config.filter) && !Array.isArray(r.authors)) {
            missing.push('authors');
        }
        if (/\bprimary_tag\b/.test(config.filter) && r.primary_tag === undefined) {
            missing.push('primary_tag');
        }
        if (/\bprimary_author\b/.test(config.filter) && r.primary_author === undefined) {
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
}

module.exports = LazyUrlService;
module.exports.LazyUrlService = LazyUrlService;
