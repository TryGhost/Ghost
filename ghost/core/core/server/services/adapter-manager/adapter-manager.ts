import path from 'node:path';
import errors from '@tryghost/errors';
import {resolveAdapterExport} from './utils';
import type {
    Adapter,
    AdapterConstructor,
    AdapterName,
    AdapterRegistry,
    ResolvedAdapter
} from './types';

export interface AdapterManagerOptions {
    /** The paths to check, e.g. ['content/adapters', 'core/server/adapters'] */
    pathsToAdapters: string[];
    /** A function to load adapters, e.g. global.require */
    loadAdapterFromPath: (path: string) => unknown;
}

/**
 * AdapterManager loads, validates and caches adapter instances by type.
 *
 * The `Registry` type parameter is a phantom, type-only map from an adapter type
 * name to the instance type of its registered base class. It has no runtime
 * representation — it is grown by chaining `registerAdapter` calls, and read back
 * by `getAdapter` to return a precisely-typed instance:
 *
 * ```ts
 * const mgr = new AdapterManager({pathsToAdapters, loadAdapterFromPath})
 *     .registerAdapter('sso', SSOBase)
 *     .registerAdapter('storage', StorageBase);
 *
 * mgr.getAdapter('sso', 'MyAdapter', opts);        // => SSOBase instance
 * mgr.getAdapter('storage:images', 'S3', opts);    // => StorageBase instance
 * ```
 */ // eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class AdapterManager<Registry extends AdapterRegistry = {}> {
    private baseClasses: Record<string, AdapterConstructor>;
    private instanceCache: Record<string, Record<string, Adapter>>;
    private pathsToAdapters: string[];
    private loadAdapterFromPath: (path: string) => unknown;

    constructor({pathsToAdapters, loadAdapterFromPath}: AdapterManagerOptions) {
        this.baseClasses = {};
        this.instanceCache = {};
        this.pathsToAdapters = pathsToAdapters;
        this.loadAdapterFromPath = loadAdapterFromPath;
    }

    /**
     * Register an adapter type and the corresponding base class. Must be called
     * before requesting adapters of that type.
     *
     * Returns `this` widened with the new type in the registry, so chained calls
     * accumulate the full set of known adapter types at the type level. Re-registering
     * a type replaces its base class at runtime, so the registry entry is replaced
     * rather than intersected — an intersection would claim the adapter still has the
     * members of the base class it no longer extends.
     *
     * @param type The name for the type of adapter
     * @param BaseClass The class from which all adapters of this type must extend
     */
    registerAdapter<Type extends string, Base extends AdapterConstructor>(
        type: Type,
        BaseClass: Base
    ): AdapterManager<Omit<Registry, Type> & Record<Type, InstanceType<Base>>> {
        if (type.includes(':')) {
            throw new errors.IncorrectUsageError({
                message: `Adapter type "${type}" cannot contain a colon.`
            });
        }

        this.instanceCache[type] = {};
        this.baseClasses[type] = BaseClass;

        return this as unknown as AdapterManager<Omit<Registry, Type> & Record<Type, InstanceType<Base>>>;
    }

    /**
     * Force recreation of all instances instead of reusing cached instances.
     * Use when editing config file during tests.
     */
    clearInstanceCache(): void {
        for (const key of Object.keys(this.instanceCache)) {
            this.instanceCache[key] = {};
        }
    }

    /**
     * getAdapter
     *
     * @param adapterName The name of the type of adapter, e.g. "storage" or
     *   "scheduling", optionally including the feature, e.g. "storage:images"
     * @param adapterClassName The active adapter instance class name e.g. "LocalFileStorage"
     * @param config The config the adapter could be instantiated with
     *
     * @returns The resolved and instantiated adapter
     */
    getAdapter<Name extends AdapterName<Registry>>(
        adapterName: Name,
        adapterClassName: string,
        config?: object
    ): ResolvedAdapter<Registry, Name>;
    getAdapter(adapterName: string, adapterClassName: string, config?: object): Adapter {
        if (!adapterName || !adapterClassName) {
            throw new errors.IncorrectUsageError({
                message: 'getAdapter must be called with a adapterName and a adapterClassName.'
            });
        }

        const [adapterType] = adapterName.split(':');
        const adapterCache = this.instanceCache[adapterType];

        if (!adapterCache) {
            throw new errors.NotFoundError({
                message: `Unknown adapter type ${adapterType}. Please register adapter.`
            });
        }

        // @NOTE: example cache key value 'email:newsletters:custom-newsletter-adapter'
        const adapterCacheKey = `${adapterName}:${adapterClassName}`;
        if (adapterCache[adapterCacheKey]) {
            return adapterCache[adapterCacheKey];
        }

        let Adapter: AdapterConstructor | null = null;
        for (const pathToAdapters of this.pathsToAdapters) {
            let pathToAdapter = path.join(pathToAdapters, adapterType, adapterClassName);
            if (pathToAdapters === '') {
                // We are loading from node_modules, we can remove the `adapterType` prefix
                pathToAdapter = path.join(pathToAdapters, adapterClassName);
            }
            try {
                const adapterModule = this.loadAdapterFromPath(pathToAdapter);
                Adapter = resolveAdapterExport(adapterModule);
                if (Adapter) {
                    break;
                }
            } catch (err) {
                // Catch runtime errors
                if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
                    throw new errors.IncorrectUsageError({err: err as Error});
                }

                // Catch missing dependencies BUT NOT missing adapter.
                // Only check the first line — Node appends a "Require stack"
                // that includes the adapter's own path, which would false-positive.
                const firstLine = err.message.split('\n')[0];
                if (!firstLine.includes(pathToAdapter)) {
                    // Name the unresolved module so the error is actionable, e.g.
                    // "Cannot find module 'superagent'" -> 'superagent'.
                    const missingMatch = /Cannot find module '([^']+)'/.exec(firstLine);
                    const missingModule = missingMatch ? ` '${missingMatch[1]}'` : '';
                    throw new errors.IncorrectUsageError({
                        message: `You are missing a dependency${missingModule} in your adapter ${pathToAdapter}`,
                        err: err as Error
                    });
                }
            }
        }

        if (!Adapter) {
            throw new errors.IncorrectUsageError({
                message: `Unable to find ${adapterType} adapter ${adapterClassName} in ${this.pathsToAdapters}.`
            });
        }

        // `Adapter` is an abstract-compatible constructor type; the runtime value
        // is always a concrete class here, so instantiation is safe.
        const AdapterClass = Adapter as new (config?: object) => Adapter;
        const adapter = new AdapterClass(config);

        const BaseClass = this.baseClasses[adapterType];
        if (!(adapter instanceof BaseClass)) {
            if (Object.getPrototypeOf(Adapter).name !== BaseClass.name) {
                throw new errors.IncorrectUsageError({
                    message: `${adapterType} adapter ${adapterClassName} does not inherit from the base class.`
                });
            }
        }

        if (!Array.isArray(adapter.requiredFns)) {
            throw new errors.IncorrectUsageError({
                message: `${adapterType} adapter ${adapterClassName} does not have the requiredFns array.`
            });
        }

        for (const requiredFn of adapter.requiredFns) {
            if (typeof (adapter as any)[requiredFn] !== 'function') {
                throw new errors.IncorrectUsageError({
                    message: `${adapterType} adapter ${adapterClassName} is missing the ${requiredFn} method.`
                });
            }
        }

        adapterCache[adapterCacheKey] = adapter;

        return adapter;
    }
}

export type InferAdapterName<T> = T extends AdapterManager<infer R> ? AdapterName<R> : never;
