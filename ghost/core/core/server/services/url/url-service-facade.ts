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
 */
export interface Resource {
    type: string;
    id?: string;
    [key: string]: unknown;
}

export interface UrlOptions {
    absolute?: boolean;
    withSubdirectory?: boolean;
}

/**
 * Eager UrlService's resource envelope: `{config: {type}, data: {...}}`.
 * Returned by `getResourceById`. The `data` field carries the raw record;
 * `config.type` is the plural router key.
 */
export interface LegacyResourceEnvelope {
    config: {type: string; [key: string]: unknown};
    data: Record<string, unknown>;
}

/**
 * Surface of the eager UrlService that the facade depends on. The full class
 * has many more methods; only those used here need typing.
 */
export interface EagerUrlService {
    getUrlByResourceId(id: string | undefined, options?: UrlOptions): string;
    owns(routerId: string, id: string | undefined): boolean;
    getResource(path: string): {config: {type: string}; data: Record<string, unknown>} | null;
    getResourceById(id: string): LegacyResourceEnvelope | null;
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

    /**
     * Forward lookup of a resource by id. Returns the eager UrlService's
     * `{config: {type, ...}, data: {...}}` envelope so existing callers
     * (e.g. the entry controller) can keep using `.config.type`.
     */
    getResourceById(resourceId: string): LegacyResourceEnvelope | null {
        return this.urlService.getResourceById(resourceId);
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

module.exports = UrlServiceFacade;
