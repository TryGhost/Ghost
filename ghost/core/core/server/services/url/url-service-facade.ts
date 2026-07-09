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

const _ = require('lodash');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

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
    getRequiredRelations(): string[];
    getRequiredFields(routerType: string): string[];
    hasFinished(): boolean;
    onRouterAddedType(...args: unknown[]): unknown;
    onRouterUpdated(...args: unknown[]): unknown;
    reset(): void;
}

export class UrlServiceFacade {
    private urlService: EagerUrlService;
    private lazyUrlService: LazyUrlServiceBackend | null;
    private compare: boolean;

    constructor({
        urlService,
        lazyUrlService = null,
        compare = false
    }: {urlService: EagerUrlService; lazyUrlService?: LazyUrlServiceBackend | null; compare?: boolean}) {
        this.urlService = urlService;
        this.lazyUrlService = lazyUrlService;
        this.compare = compare;
    }

    isLazy(): boolean {
        return !!this.lazyUrlService && !this.compare;
    }

    isComparing(): boolean {
        return this.compare && !!this.lazyUrlService;
    }

    /**
     * The full resource record is required: the lazy backend evaluates NQL
     * filters and applies permalink templates against it.
     */
    getUrlForResource(resource: Resource, options?: UrlOptions): string {
        if (this.isLazy()) {
            return this.lazyUrlService!.getUrlForResource(resource, options);
        }
        const url = this.urlService.getUrlByResourceId(resource.id, options);
        if (this.isComparing()) {
            const context = this._compareContext(resource);
            setImmediate(() => this._compare('getUrlForResource', url,
                () => this.lazyUrlService!.getUrlForResource(resource, options),
                context));
        }
        return url;
    }

    ownsResource(routerIdentifier: string, resource: Resource): boolean {
        if (this.isLazy()) {
            return this.lazyUrlService!.ownsResource(routerIdentifier, resource);
        }
        const owns = this.urlService.owns(routerIdentifier, resource.id);
        if (this.isComparing()) {
            const context = this._compareContext(resource, {routerIdentifier});
            setImmediate(() => this._compare('ownsResource', owns,
                () => this.lazyUrlService!.ownsResource(routerIdentifier, resource),
                context));
        }
        return owns;
    }

    // Context for a compare report. Must be built synchronously in the calling
    // frame: the comparison itself runs from setImmediate, where the caller's
    // stack is gone — so a lazy throw reported there names only the URL service
    // internals, not which caller handed over the (possibly thin) resource.
    // `caller` recaptures those frames; `resourceKeys` fingerprints the shape
    // the caller passed (e.g. a Content-API-serialized post vs a full model).
    private _compareContext(resource: Resource, extra: Record<string, unknown> = {}): Record<string, unknown> {
        const caller: {stack?: string} = {};
        Error.captureStackTrace(caller, this._compareContext);
        return {
            type: resource.type,
            id: resource.id,
            resourceKeys: Object.keys(resource),
            caller: caller.stack,
            ...extra
        };
    }

    /**
     * Reverse URL lookup. Returns a flat resource shape (e.g. `{type, id, slug}`)
     * rather than the legacy `{config: {type}, data: {...}}` envelope. Async to
     * match the lazy implementation's contract.
     */
    async resolveUrl(urlPath: string): Promise<Resource | null> {
        if (this.isLazy()) {
            return this.lazyUrlService!.resolveUrl(urlPath);
        }
        const resource = this.urlService.getResource(urlPath);
        // The routing-level type ('posts', 'pages', 'tags', 'authors') wins
        // over any DB type field on resource.data so the flat Resource is
        // unambiguous.
        const eagerResult = resource
            ? Object.assign({}, resource.data, {type: resource.config.type}) as Resource
            : null;
        if (this.isComparing()) {
            // Fire-and-forget: don't await lazy so the reverse lookup adds no
            // latency for its callers; the lazy DB read runs in the background.
            void this._compareAsync('resolveUrl', eagerResult,
                () => this.lazyUrlService!.resolveUrl(urlPath),
                {path: urlPath},
                (a, b) => _.isEqual(a, b));
        }
        return eagerResult;
    }

    // Returns [] when there is no lazy backend: eager looks URLs up by id and
    // never touches a resource's relations.
    getRequiredRelations(): string[] {
        if (this.lazyUrlService) {
            return this.lazyUrlService.getRequiredRelations();
        }
        return [];
    }

    // Columns a resource of this type must carry for the lazy backend to build
    // its URL. [] with no lazy backend: eager looks URLs up by id and never
    // reads these fields.
    getRequiredFields(routerType: string): string[] {
        if (this.lazyUrlService) {
            return this.lazyUrlService.getRequiredFields(routerType);
        }
        return [];
    }

    hasFinished(): boolean {
        if (this.isLazy()) {
            return this.lazyUrlService!.hasFinished();
        }
        // Track eager when comparing: lazy always reports ready and would gate traffic in early.
        return this.urlService.hasFinished();
    }

    // While comparing, register on both so lazy sees the same routers as eager.
    onRouterAddedType(...args: unknown[]): unknown {
        if (this.isComparing()) {
            this._runLazyHook('onRouterAddedType', () => this.lazyUrlService!.onRouterAddedType(...args));
            return this.urlService.onRouterAddedType(...args);
        }
        if (this.lazyUrlService) {
            return this.lazyUrlService.onRouterAddedType(...args);
        }
        return this.urlService.onRouterAddedType(...args);
    }

    onRouterUpdated(...args: unknown[]): unknown {
        if (this.isComparing()) {
            this._runLazyHook('onRouterUpdated', () => this.lazyUrlService!.onRouterUpdated(...args));
            return this.urlService.onRouterUpdated(...args);
        }
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
            this._runLazyHook('reset', () => this.lazyUrlService!.reset());
        }
    }

    // Runs a lazy router hook in compare mode. Lazy failures are swallowed and
    // reported so they can never block the authoritative eager hook (or, for
    // reset, break a routes reload).
    private _runLazyHook(method: string, fn: () => void): void {
        try {
            fn();
        } catch (err) {
            this._reportLazyError(method, err as Error, {});
        }
    }

    // Runs lazy alongside eager and logs any divergence; eager's value is always
    // returned. Lazy errors are swallowed so a comparison can't break a request.
    private _compare(
        method: string,
        eagerValue: unknown,
        getLazyValue: () => unknown,
        context: Record<string, unknown>,
        isEqual: (a: unknown, b: unknown) => boolean = (a, b) => a === b
    ): void {
        let lazyValue: unknown;
        try {
            lazyValue = getLazyValue();
        } catch (err) {
            this._reportLazyError(method, err as Error, context);
            return;
        }
        this._reportMismatch(method, eagerValue, lazyValue, context, isEqual);
    }

    private async _compareAsync(
        method: string,
        eagerValue: unknown,
        getLazyValue: () => Promise<unknown>,
        context: Record<string, unknown>,
        isEqual: (a: unknown, b: unknown) => boolean = (a, b) => a === b
    ): Promise<void> {
        let lazyValue: unknown;
        try {
            lazyValue = await getLazyValue();
        } catch (err) {
            this._reportLazyError(method, err as Error, context);
            return;
        }
        this._reportMismatch(method, eagerValue, lazyValue, context, isEqual);
    }

    private _reportMismatch(
        method: string,
        eagerValue: unknown,
        lazyValue: unknown,
        context: Record<string, unknown>,
        isEqual: (a: unknown, b: unknown) => boolean
    ): void {
        if (!isEqual(eagerValue, lazyValue)) {
            this._report(new errors.InternalServerError({
                message: 'URL service parity mismatch',
                code: 'LAZY_URL_PARITY_MISMATCH',
                errorDetails: {method, eager: eagerValue, lazy: lazyValue, ...context}
            }));
        }
    }

    private _reportLazyError(method: string, err: Error, context: Record<string, unknown>): void {
        this._report(new errors.InternalServerError({
            message: 'Lazy URL service threw during comparison',
            code: 'LAZY_URL_COMPARE_ERROR',
            err,
            errorDetails: {method, ...context}
        }));
    }

    private _report(error: Error): void {
        logging.error(error);
    }
}

// `export class` already emits `exports.UrlServiceFacade`. We additionally
// re-attach `module.exports = UrlServiceFacade` AND keep the named export, so
// both `const UrlServiceFacade = require('./url-service-facade')` and
// `const { UrlServiceFacade } = require('./url-service-facade')` work.
module.exports = UrlServiceFacade;
module.exports.UrlServiceFacade = UrlServiceFacade;
