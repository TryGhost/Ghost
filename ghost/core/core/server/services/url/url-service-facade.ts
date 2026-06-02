/**
 * UrlServiceFacade
 *
 * Sits in front of the URL service so callers can use a stable, resource-based
 * interface regardless of the underlying implementation. The facade can be
 * built with two backends:
 *
 *  - urlService:     the legacy eager UrlService that precomputes a full
 *                    resource → URL map at boot.
 *  - lazyUrlService: an on-demand implementation (LazyUrlService) that
 *                    computes URLs and ownership per call.
 *
 * When `lazyUrlService` is provided the facade routes calls to it; otherwise
 * it delegates to the eager `urlService`. This lets the lazy implementation be
 * swapped in behind a config flag without touching individual callers.
 */

/**
 * Routing-level resource. `type` is one of the plural router keys
 * ('posts', 'pages', 'tags', 'authors'). Concrete records carry additional
 * fields (slug, published_at, primary_tag, ...) used by permalink templates.
 *
 * `id` is required: the eager backend's URL lookup is id-based, so a missing
 * `id` would silently return `/404/`. Every in-tree caller already passes an
 * id; the type makes that mandatory.
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
 * Eager UrlService's resource envelope: `{config: {type}, data: {...}}`.
 * Returned by `getResource(path)`. The `data` field carries the raw record;
 * `id` is always present because the eager URL service keys its in-memory
 * map by id, and the type makes that contract explicit.
 */
export interface LegacyResourceEnvelope {
    config: {type: string; [key: string]: unknown};
    data: {id: string; [key: string]: unknown};
}

/**
 * Surface of the eager UrlService that the facade depends on. The full class
 * has many more methods; only those used here need typing.
 */
export interface EagerUrlService {
    getUrlByResourceId(id: string, options?: UrlOptions): string;
    owns(routerId: string, id: string): boolean;
    getResource(path: string): LegacyResourceEnvelope | null;
    hasFinished(): boolean;
    onRouterAddedType(...args: unknown[]): unknown;
    onRouterUpdated(...args: unknown[]): unknown;
}

export interface LazyUrlServiceBackend {
    getUrlForResource(resource: Resource, options?: UrlOptions): string;
    ownsResource(routerId: string, resource: Resource): boolean;
    resolveUrl(path: string): Promise<Resource | null>;
    hasFinished(): boolean;
    onRouterAddedType(...args: unknown[]): unknown;
    onRouterUpdated(...args: unknown[]): unknown;
    reset(): void;
}

export class UrlServiceFacade {
    private urlService: EagerUrlService;
    private lazyUrlService: LazyUrlServiceBackend | null;

    constructor({
        urlService,
        lazyUrlService = null
    }: {urlService: EagerUrlService; lazyUrlService?: LazyUrlServiceBackend | null}) {
        this.urlService = urlService;
        this.lazyUrlService = lazyUrlService;
    }

    isLazy(): boolean {
        return !!this.lazyUrlService;
    }

    /**
     * The full resource record is required: the lazy backend evaluates NQL
     * filters and applies permalink templates against it.
     */
    getUrlForResource(resource: Resource, options?: UrlOptions): string {
        if (this.lazyUrlService) {
            return this.lazyUrlService.getUrlForResource(resource, options);
        }
        return this.urlService.getUrlByResourceId(resource.id, options);
    }

    ownsResource(routerIdentifier: string, resource: Resource): boolean {
        if (this.lazyUrlService) {
            return this.lazyUrlService.ownsResource(routerIdentifier, resource);
        }
        return this.urlService.owns(routerIdentifier, resource.id);
    }

    /**
     * Reverse URL lookup. Returns a flat resource shape (e.g. `{type, id, slug}`)
     * rather than the legacy `{config: {type}, data: {...}}` envelope. Async to
     * match the lazy implementation's contract.
     */
    async resolveUrl(urlPath: string): Promise<Resource | null> {
        if (this.lazyUrlService) {
            return this.lazyUrlService.resolveUrl(urlPath);
        }
        const resource = this.urlService.getResource(urlPath);
        if (!resource) {
            return null;
        }
        // The routing-level type ('posts', 'pages', 'tags', 'authors') wins
        // over any DB type field on resource.data so the flat Resource is
        // unambiguous.
        return Object.assign({}, resource.data, {type: resource.config.type}) as Resource;
    }

    hasFinished(): boolean {
        if (this.lazyUrlService) {
            return this.lazyUrlService.hasFinished();
        }
        return this.urlService.hasFinished();
    }

    onRouterAddedType(...args: unknown[]): unknown {
        if (this.lazyUrlService) {
            return this.lazyUrlService.onRouterAddedType(...args);
        }
        return this.urlService.onRouterAddedType(...args);
    }

    onRouterUpdated(...args: unknown[]): unknown {
        if (this.lazyUrlService) {
            return this.lazyUrlService.onRouterUpdated(...args);
        }
        return this.urlService.onRouterUpdated(...args);
    }

    /**
     * Reset all router registrations. Used when routes.yaml is reloaded in
     * lazy mode. In eager mode the URL service handles resets via its queue.
     */
    reset(): void {
        if (this.lazyUrlService) {
            this.lazyUrlService.reset();
        }
    }
}

// `export class` already emits `exports.UrlServiceFacade`. We additionally
// re-attach `module.exports = UrlServiceFacade` AND keep the named export, so
// both `const UrlServiceFacade = require('./url-service-facade')` and
// `const { UrlServiceFacade } = require('./url-service-facade')` work.
module.exports = UrlServiceFacade;
module.exports.UrlServiceFacade = UrlServiceFacade;
