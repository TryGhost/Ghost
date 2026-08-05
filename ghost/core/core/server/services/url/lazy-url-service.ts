const debug = require('@tryghost/debug')('services:url:lazy');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const localUtils = require('../../../shared/url-utils').default;
const {matchPermalink, toLookupParams} = require('./permalink-matcher');
const {buildFilter, filterMatches, routerTypeOf} = require('./router-filter');
const {fetchRoutableResources: defaultFetchRoutableResources} = require('./routable-resources');
const urlConfig = require('./config');

import type {CompiledFilter} from './router-filter';
import type {PermalinkParams} from './permalink-matcher';

/**
 * Routing-level resource. `type` is one of the plural router keys
 * ('posts', 'pages', 'tags', 'authors'). Concrete records carry additional
 * fields (slug, published_at, primary_tag, ...) read by the permalink
 * templates and router filters.
 */
export interface Resource {
    type: string;
    id: string;
    [key: string]: unknown;
}

export interface UrlOptions {
    absolute?: boolean;
    withSubdirectory?: boolean;
}

/**
 * On-demand enumeration of the routable rows of a type. Injectable so tests
 * can drive `getRoutableResources` without a database.
 */
export type FetchRoutableResources = (
    type: string,
    options: {columns?: string[]; requiredFields?: string[]; requiredRelations?: string[]}
) => Promise<Array<Record<string, unknown>>>;

export type ResourceLookupParams = {id: string} | {slug: string};

export type FindResource = (
    routerType: string,
    params: ResourceLookupParams
) => Promise<Record<string, unknown> | null>;

interface RouterConfig {
    identifier: string;
    filter: string | null;
    resourceType: string;
    permalink: string;
    compiledFilter: CompiledFilter | null;
}

// Per-resource-type gate on which rows get a URL at all — the forward-lookup
// counterpart of the fetch filters in routable-resources.js. `fields` lists
// the record columns each filter reads; a resource that reaches URL generation
// must carry them (see _assertBaseFieldsPresent).
//
// Authors are intentionally absent: users.visibility is schema-pinned to
// 'public' (isIn: [['public']]), so the visibility:public author filter never
// excludes anyone — every author is routable, and serialized authors drop
// visibility anyway (#10438).
const BASE_FILTERS: Record<string, {filter: string; fields: string[]}> = {
    posts: {filter: 'status:published+type:post', fields: ['status', 'type']},
    pages: {filter: 'status:published+type:page', fields: ['status', 'type']},
    tags: {filter: 'visibility:public', fields: ['visibility']}
};

interface BaseFilter {
    filter: string;
    compiledFilter: CompiledFilter;
    fields: string[];
}

function buildBaseFilters(): Map<string, BaseFilter> {
    const baseFilters = new Map<string, BaseFilter>();
    for (const [type, {filter, fields}] of Object.entries(BASE_FILTERS)) {
        const compiledFilter = buildFilter(filter);
        if (compiledFilter) {
            baseFilters.set(type, {filter, compiledFilter, fields});
        }
    }
    return baseFilters;
}

// Columns a router filter must not see (the `exclude` lists in
// services/url/config.js), keyed by resourceType. Ghost previously answered
// URLs from a precomputed cache that dropped these columns, so a filter
// referencing one matched it as absent — NQL reads absent as null. This
// service loads full records and would see the real value, so it strips them
// before evaluating router filters (and neither requires nor force-loads
// them), keeping routes.yaml files that rely on that behaviour working. The
// base filter above is unaffected — it runs against the full record.
function buildExcludedFilterFields(): Map<string, Set<string>> {
    const excluded = new Map<string, Set<string>>();
    for (const entry of urlConfig) {
        const exclude = entry?.modelOptions?.exclude;
        if (Array.isArray(exclude)) {
            excluded.set(entry.type, new Set(exclude));
        }
    }
    return excluded;
}

const EMPTY_FIELD_SET: ReadonlySet<string> = new Set();

// Relation roots are loaded via getRequiredRelations (as withRelated), not as
// scalar columns; `page`/`type` are the router-type discriminator, always set
// on the resource. Everything else a router filter references is a scalar
// own-column the resource must carry to be routed like eager.
const FILTER_NON_SCALAR_FIELDS = new Set([
    'tag', 'tags', 'author', 'authors', 'primary_tag', 'primary_author', 'page', 'type'
]);

// Scalar (own-column) fields a router filter reads, e.g. 'featured' from
// 'featured:true'. Dotted clauses (e.g. tags.visibility) are relation
// sub-fields and skipped — getRequiredRelations loads those relations.
//
// Only field names at an NQL expression boundary (start of the filter, or after
// a `+`/`,`/`(` combinator) are matched, so colon-bearing values — URLs,
// timestamps like 2020-01-01T00:00:00 — aren't mistaken for fields.
function filterScalarFields(filter: string | null): string[] {
    if (!filter) {
        return [];
    }
    const fields = new Set<string>();
    const matcher = /(?:^|[+,(])\s*(\w+)(\.\w+)?:/g;
    let match;
    while ((match = matcher.exec(filter)) !== null) {
        const [, root, sub] = match;
        if (sub || FILTER_NON_SCALAR_FIELDS.has(root)) {
            continue;
        }
        fields.add(root);
    }
    return [...fields];
}

interface LazyUrlServiceDeps {
    urlUtils?: typeof localUtils;
    findResource: FindResource;
    fetchRoutableResources?: FetchRoutableResources;
}

const ROUTER_TYPE_TO_DB_TYPE: Record<string, string> = {posts: 'post', pages: 'page'};

/**
 * Ghost's URL service: computes URLs and ownership per call from the
 * registered router configs. Forward lookups are pure; resolveUrl and
 * getRoutableResources are the only DB-touching paths, and only through the
 * injected findResource / fetchRoutableResources hooks.
 */
export class LazyUrlService {
    private urlUtils: typeof localUtils;
    private findResource: FindResource;
    private fetchRoutableResources: FetchRoutableResources;
    // Router configs in registration order, which is also their priority.
    private routerConfigs: RouterConfig[];
    private requiredRelations: string[] | null;
    private baseFilters: Map<string, BaseFilter>;
    private excludedFilterFields: Map<string, Set<string>>;
    // True once routers have been registered. Cleared by reset() so the
    // route-reload window re-gates the maintenance middleware.
    private routersReady: boolean;

    constructor({
        urlUtils = localUtils,
        findResource,
        fetchRoutableResources = defaultFetchRoutableResources
    }: LazyUrlServiceDeps) {
        if (typeof findResource !== 'function') {
            throw new errors.IncorrectUsageError({
                message: 'LazyUrlService requires a findResource function'
            });
        }
        this.urlUtils = urlUtils;
        this.findResource = findResource;
        this.fetchRoutableResources = fetchRoutableResources;
        this.routerConfigs = [];
        this.requiredRelations = null;
        this.baseFilters = buildBaseFilters();
        this.excludedFilterFields = buildExcludedFilterFields();
        this.routersReady = false;
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
        this.requiredRelations = null;
        this.routersReady = true;
    }

    onRouterUpdated(): void {
        // Defensive: a router update could change a filter the cache derived
        // from, so drop it and recompute lazily on next read.
        this.requiredRelations = null;
    }

    reset(): void {
        this.routerConfigs = [];
        this.requiredRelations = null;
        this.routersReady = false;
    }

    getRequiredRelations(): string[] {
        if (this.requiredRelations !== null) {
            return [...this.requiredRelations];
        }
        const required = new Set<string>();
        for (const config of this.routerConfigs) {
            if (config.filter) {
                if (/\btags?\b/.test(config.filter) || /\bprimary_tag\b/.test(config.filter)) {
                    required.add('tags');
                }
                if (/\bauthors?\b/.test(config.filter) || /\bprimary_author\b/.test(config.filter)) {
                    required.add('authors');
                }
            }
            if (config.permalink) {
                if (/\bprimary_tag\b/.test(config.permalink)) {
                    required.add('tags');
                }
                if (/\bprimary_author\b/.test(config.permalink)) {
                    required.add('authors');
                }
            }
        }
        this.requiredRelations = [...required];
        return [...this.requiredRelations];
    }

    // Columns a resource of this type must carry for the lazy service to build
    // its URL: its base-filter columns plus the scalar columns its routers'
    // permalinks substitute and filters read. Relations are covered separately
    // by getRequiredRelations; eager needs none of this (it looks URLs up by id).
    getRequiredFields(routerType: string): string[] {
        const fields = new Set<string>();
        const excluded = this._excludedFilterFieldsFor(routerType);
        const base = this.baseFilters.get(routerType);
        if (base) {
            base.fields.forEach(field => fields.add(field));
        }
        for (const config of this.routerConfigs) {
            if (config.resourceType !== routerType) {
                continue;
            }
            if (/\bslug\b/.test(config.permalink)) {
                fields.add('slug');
            }
            if (/\bid\b/.test(config.permalink)) {
                fields.add('id');
            }
            if (/\b(year|month|day)\b/.test(config.permalink)) {
                fields.add('published_at');
            }
            // primary_tag/primary_author are computed attributes the model
            // only attaches when `options.columns` names them, so they must
            // be forced like scalar columns — the tags/authors relations
            // (via getRequiredRelations) alone don't surface them on a
            // `?fields=url` query.
            for (const computed of ['primary_tag', 'primary_author'] as const) {
                if (new RegExp(`\\b${computed}\\b`).test(config.permalink) ||
                    (config.filter && new RegExp(`\\b${computed}\\b`).test(config.filter))) {
                    fields.add(computed);
                }
            }
            // Skip columns eager drops from its cache: it never force-loads them
            // and evaluates their filters against an absent value, so lazy must
            // not require them either (see buildExcludedFilterFields).
            filterScalarFields(config.filter).forEach((field) => {
                if (!excluded.has(field)) {
                    fields.add(field);
                }
            });
        }
        return [...fields];
    }

    hasFinished(): boolean {
        return this.routersReady;
    }

    /**
     * All routable rows of a type. The columns URL computation needs come
     * from the active routing config, so the rows are never thin for it;
     * callers name any extra columns they want back.
     */
    async getRoutableResources(type: string, {columns = []}: {columns?: string[]} = {}): Promise<Array<Record<string, unknown>>> {
        return this.fetchRoutableResources(type, {
            columns,
            requiredFields: this.getRequiredFields(type),
            requiredRelations: this.getRequiredRelations()
        });
    }

    /**
     * A thin resource — one missing a column its base filter or a router
     * filter reads — is a caller bug: we cannot tell whether it routes. It is
     * reported and degraded to /404/ rather than thrown, because 500ing a page
     * that does route is worse than a 404 on one that may not. Every other
     * failure is a backend bug and propagates.
     */
    getUrlForResource(resource: Resource, options: UrlOptions = {}): string {
        try {
            return this._buildUrlForResource(resource, options);
        } catch (err) {
            if ((err as {code?: string} | null)?.code !== 'LAZY_URL_THIN_RESOURCE') {
                throw err;
            }
            this._reportThinResource(resource, err as Error);
            return this.notFoundUrl(options);
        }
    }

    private _buildUrlForResource(resource: Resource, options: UrlOptions): string {
        const routerType = routerTypeOf(resource);
        if (!routerType) {
            return this.notFoundUrl(options);
        }

        const record = this._recordForFilter(resource);
        // The router (collection) filter is evaluated against eager's reduced
        // column set; the base filter keeps the full record (it reads status /
        // type / visibility, which eager applies at query time, not in cache).
        const filterRecord = this._recordForRouterFilter(record, routerType);

        // Eager only builds URLs for resources that pass the per-type base
        // filter (e.g. visibility:public tags, status:published posts), so a
        // resource failing it has no URL there and must 404 here too. Checked
        // only when a router for the type exists, since otherwise the resource
        // 404s regardless.
        if (this._hasRouterForType(routerType)) {
            this._assertBaseFieldsPresent(routerType, resource);
            if (!this._baseFilterMatches(routerType, record)) {
                return this.notFoundUrl(options);
            }
        }

        for (const config of this.routerConfigs) {
            if (config.resourceType !== routerType) {
                continue;
            }
            this._assertNotThin(config, resource, routerType);
            if (filterMatches(config.compiledFilter, filterRecord)) {
                const path = this.urlUtils.replacePermalink(config.permalink, resource);
                return this._formatPath(path, options);
            }
        }
        return this.notFoundUrl(options);
    }

    ownsResource(routerIdentifier: string, resource: Resource | null): boolean {
        if (!resource) {
            return false;
        }
        const routerType = routerTypeOf(resource);
        if (!routerType) {
            return false;
        }
        // A resource failing its base filter is not in eager's map, so no
        // router owns it. Mirrors the base-filter gate in getUrlForResource.
        const record = this._recordForFilter(resource);
        if (!this._baseFilterMatches(routerType, record)) {
            return false;
        }
        const filterRecord = this._recordForRouterFilter(record, routerType);
        // Ownership is exclusive: only the first matching router of the type
        // owns the resource, matching eager's reservation.
        const owner = this.routerConfigs.find(
            c => c.resourceType === routerType && filterMatches(c.compiledFilter, filterRecord)
        );
        return !!owner && owner.identifier === routerIdentifier;
    }

    async resolveUrl(urlPath: string): Promise<Resource | null> {
        // Memoize per call so routers sharing a resourceType+permalink shape (or
        // fallthrough across filters) don't repeat the same DB lookup.
        const lookupCache = new Map<string, Record<string, unknown> | null>();
        for (const config of this.routerConfigs) {
            const params = matchPermalink(config.permalink, urlPath);
            if (!params) {
                continue;
            }
            // matchPermalink only matches permalinks that capture a queryable
            // column, so this always yields a usable lookup.
            const lookupParams = toLookupParams(params);
            const cacheKey = `${config.resourceType}:${JSON.stringify(lookupParams)}`;
            let resource: Record<string, unknown> | null;
            if (lookupCache.has(cacheKey)) {
                resource = lookupCache.get(cacheKey) ?? null;
            } else {
                resource = await this.findResource(config.resourceType, lookupParams);
                lookupCache.set(cacheKey, resource);
            }
            if (!resource) {
                continue;
            }
            // Normalize the same way the forward paths do so page: filters are
            // evaluated against an identical shape regardless of findResource.
            // The base filter is enforced upstream by findResource's query
            // scoping (visibility:public / status:published), so only the
            // router filter needs re-checking here.
            const record = this._recordForRouterFilter(
                this._recordForFilter(resource as Resource),
                config.resourceType
            );
            if (!filterMatches(config.compiledFilter, record)) {
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
    private _matchesCanonicalUrl(config: RouterConfig, params: PermalinkParams, resource: Record<string, unknown>): boolean {
        const canonicalPath = this.urlUtils.replacePermalink(config.permalink, resource);
        const canonicalParams = matchPermalink(config.permalink, canonicalPath);
        if (!canonicalParams) {
            return false;
        }
        const captured = params as Record<string, string>;
        const canonical = canonicalParams as Record<string, string>;
        return Object.keys(captured).every(key => canonical[key] === captured[key]);
    }

    // The thrown error names the missing columns; this adds what the caller
    // handed over — its resource shape, and what the active routing config
    // needs — so the fetch that produced the thin resource can be found.
    private _reportThinResource(resource: Resource, err: Error): void {
        const report = new errors.InternalServerError({
            message: 'Lazy URL service could not build a URL, degraded to /404/',
            code: 'LAZY_URL_RESOLUTION_ERROR',
            err
        });
        // @tryghost/errors copies the wrapped error's enumerable props over the
        // new error, so the thrown error's own errorDetails would otherwise
        // clobber these. Merge both after construction.
        report.errorDetails = {
            method: 'getUrlForResource',
            type: resource.type,
            id: resource.id,
            status: (resource as Record<string, unknown>).status,
            resourceKeys: Object.keys(resource),
            requiredRelations: this.getRequiredRelations(),
            ...(err as {errorDetails?: Record<string, unknown>}).errorDetails
        };
        logging.error(report);
    }

    private _hasRouterForType(routerType: string): boolean {
        return this.routerConfigs.some(config => config.resourceType === routerType);
    }

    private _baseFilterMatches(routerType: string, record: Record<string, unknown>): boolean {
        const base = this.baseFilters.get(routerType);
        if (!base) {
            return true;
        }
        return filterMatches(base.compiledFilter, record);
    }

    // A resource that reaches URL generation must carry the columns its base
    // filter reads (status for posts/pages, visibility for tags) — production
    // callers always do (full models, or forced by the serializers). Without
    // them the filter can't be evaluated and we'd silently 404 a URL eager would
    // have produced, so refuse loudly instead of guessing.
    private _assertBaseFieldsPresent(routerType: string, resource: Resource): void {
        const base = this.baseFilters.get(routerType);
        if (!base) {
            return;
        }
        const r = resource as Record<string, unknown>;
        const missing = base.fields.filter(field => r[field] === undefined);
        if (missing.length === 0) {
            return;
        }
        throw new errors.InternalServerError({
            message: 'Thin resource passed to LazyUrlService.getUrlForResource',
            code: 'LAZY_URL_THIN_RESOURCE',
            errorDetails: {
                resourceType: routerType,
                resourceId: resource.id,
                baseFilter: base.filter,
                missing
            }
        });
    }

    // Normalizes the plural router type to the singular DB value for filter
    // evaluation only, so page: filters match as in the eager generator.
    private _recordForFilter(resource: Resource): Record<string, unknown> {
        const record = resource as Record<string, unknown>;
        const dbType = ROUTER_TYPE_TO_DB_TYPE[record.type as string];
        return dbType ? {...record, type: dbType} : record;
    }

    private _excludedFilterFieldsFor(routerType: string): ReadonlySet<string> {
        return this.excludedFilterFields.get(routerType) ?? EMPTY_FIELD_SET;
    }

    // Strips the columns eager drops from its cache so a router/collection
    // filter is evaluated against the same reduced shape eager uses — an
    // excluded column reads as absent (→ null in NQL) rather than its real
    // value. Only affects filters that reference an excluded column; every
    // other filter sees an identical record.
    private _recordForRouterFilter(record: Record<string, unknown>, routerType: string): Record<string, unknown> {
        const excluded = this._excludedFilterFieldsFor(routerType);
        if (excluded.size === 0) {
            return record;
        }
        const stripped: Record<string, unknown> = {};
        for (const key of Object.keys(record)) {
            if (!excluded.has(key)) {
                stripped[key] = record[key];
            }
        }
        return stripped;
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
     * The /404/ a resource gets when nothing routes it, formatted for the given
     * options. Deliberately omits the argument `_formatPath` passes.
     *
     * The subdirectory is not lost by that omission: `createUrl` takes it from
     * its own base whenever the url is relative, so a subdirectory install gets
     * `/blog/404/` from here either way. The third argument `_formatPath`
     * passes is `trailingSlash`, and `/404/` already ends in one.
     */
    notFoundUrl(options: UrlOptions = {}): string {
        if (options.absolute) {
            return this.urlUtils.createUrl('/404/', options.absolute);
        }
        if (options.withSubdirectory) {
            return this.urlUtils.createUrl('/404/', false);
        }
        return '/404/';
    }

    // A filtered router that references a relation the resource doesn't carry
    // can't be evaluated, so the resource would 404 for a reason that has
    // nothing to do with the routing config. Callers must hand over
    // fully-inflated resources; a thin one is reported rather than silently
    // 404'd (see getUrlForResource).
    private _assertNotThin(config: RouterConfig, resource: Resource, routerType: string): void {
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
        // Columns eager drops from its cache are never required — its filters
        // match them as absent, so a resource lacking one is not thin here.
        const excluded = this._excludedFilterFieldsFor(routerType);
        for (const field of filterScalarFields(config.filter)) {
            if (!excluded.has(field) && r[field] === undefined) {
                missing.push(field);
            }
        }
        if (missing.length === 0) {
            return;
        }
        throw new errors.InternalServerError({
            message: 'Thin resource passed to LazyUrlService.getUrlForResource',
            code: 'LAZY_URL_THIN_RESOURCE',
            errorDetails: {
                resourceType: routerType,
                resourceId: resource.id,
                routerIdentifier: config.identifier,
                filter: config.filter,
                missing
            }
        });
    }
}

module.exports = LazyUrlService;
module.exports.LazyUrlService = LazyUrlService;
