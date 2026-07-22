const debug = require('@tryghost/debug')('services:url:lazy');
const errors = require('@tryghost/errors');
const localUtils = require('../../../shared/url-utils');
const {matchPermalink, toLookupParams} = require('./permalink-matcher');
const {buildFilter, filterMatches, routerTypeOf} = require('./router-filter');
const urlConfig = require('./config');

import type {Resource, UrlOptions, LazyUrlServiceBackend} from './url-service-facade';
import type {CompiledFilter} from './router-filter';
import type {PermalinkParams} from './permalink-matcher';

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

// Per-resource-type base filters, mirroring eager's resource-fetch filters
// (`modelOptions.filter` in services/url/config.js). Deliberately duplicated
// rather than imported: lazy is meant to replace eager, at which point eager's
// config goes away and this becomes the single source. `fields` lists the
// record columns each filter reads; a resource that reaches URL generation
// must carry them (a thin one is rejected — see _assertBaseFieldsPresent).
//
// Authors are intentionally absent: users.visibility is schema-pinned to
// 'public' (isIn: [['public']]), so eager's visibility:public author filter
// never excludes anyone — every author is routable, and serialized authors
// drop visibility anyway (#10438).
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

// Columns eager drops from its in-memory URL cache (the `exclude` lists in
// services/url/config.js). Eager evaluates a router's collection filter against
// that reduced cached record, so an excluded column reads as absent — NQL then
// treats it as null. Lazy loads full records and would see the real value, so
// to preserve eager's behaviour it strips these columns before evaluating
// router filters (and neither requires nor force-loads them). Keyed by
// resourceType ('posts'/'pages'/'tags'). Read from eager's config directly so
// the two can't drift; when eager is retired this derives from whatever
// replaces it. The base filter is unaffected — it runs against the full record.
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
    private findResource: FindResource;
    // Router configs in registration order, which is also their priority.
    private routerConfigs: RouterConfig[];
    private requiredRelations: string[] | null;
    private baseFilters: Map<string, BaseFilter>;
    private excludedFilterFields: Map<string, Set<string>>;

    constructor({urlUtils = localUtils, findResource}: LazyUrlServiceDeps) {
        if (typeof findResource !== 'function') {
            throw new errors.IncorrectUsageError({
                message: 'LazyUrlService requires a findResource function'
            });
        }
        this.urlUtils = urlUtils;
        this.findResource = findResource;
        this.routerConfigs = [];
        this.requiredRelations = null;
        this.baseFilters = buildBaseFilters();
        this.excludedFilterFields = buildExcludedFilterFields();
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
    }

    onRouterUpdated(): void {
        // Defensive: a router update could change a filter the cache derived
        // from, so drop it and recompute lazily on next read.
        this.requiredRelations = null;
    }

    reset(): void {
        this.routerConfigs = [];
        this.requiredRelations = null;
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
        return true;
    }

    getUrlForResource(resource: Resource, options: UrlOptions = {}): string {
        const routerType = routerTypeOf(resource);
        if (!routerType) {
            return this._formatNotFound(options);
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
                return this._formatNotFound(options);
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

    // A filtered router that references a relation the resource doesn't carry
    // can't be evaluated: lazy would 404 here while eager (full data in memory)
    // returns a URL. Callers must hand the service fully-inflated resources, so
    // a thin one is a programmer error we refuse loudly rather than mask as a
    // silent /404/.
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
