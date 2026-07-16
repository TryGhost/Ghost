import path from 'node:path';
import errors from '@tryghost/errors';
import {resolveAdapterExport, resolveAdapterOptions, normalizeAdapterConfig, getConfiguredFeatures} from './utils';
import type {ConfigInstance} from '../../../shared/config/loader';
import type {
    Adapter,
    AdapterConstructor,
    AdapterName,
    ResolvedAdapter
} from './types';

/**
 * A map from an adapter type name (e.g. "storage") to the base class every
 * adapter of that type must extend.
 */
export type BaseClassMap = Record<string, AdapterConstructor>;

/**
 * The type-only registry derived from a `BaseClassMap`: each adapter type name
 * mapped to the instance type of its base class. Read back by `getAdapter` to
 * return a precisely-typed instance.
 */
export type RegistryOf<BaseClasses extends BaseClassMap> = {
    [Type in keyof BaseClasses]: InstanceType<BaseClasses[Type]>;
};

export interface AdapterManagerOptions<BaseClasses extends BaseClassMap = BaseClassMap> {
    /** The paths to check, e.g. ['content/adapters', 'core/server/adapters'] */
    pathsToAdapters: string[];
    /** A function to load adapters, e.g. global.require */
    loadAdapterFromPath: (path: string) => unknown;
    /** The base classes keyed by adapter type name, e.g. {storage: GhostStorageBase} */
    baseClasses: BaseClasses;
    /** The config instance used to resolve which adapter and options to load */
    config: ConfigInstance;
}

/**
 * AdapterManager loads, validates and caches adapter instances by type.
 *
 * The set of known adapter types (and the base class each must extend) is fixed
 * at construction time via the `baseClasses` map. The `BaseClasses` type
 * parameter is inferred from that map, so `getAdapter` can return a
 * precisely-typed instance:
 *
 * ```ts
 * const mgr = new AdapterManager({
 *     pathsToAdapters,
 *     loadAdapterFromPath,
 *     config,
 *     baseClasses: {sso: SSOBase, storage: StorageBase}
 * });
 *
 * mgr.getAdapter('sso');            // => SSOBase instance
 * mgr.getAdapter('storage:images'); // => StorageBase instance
 * ```
 */
export class AdapterManager<BaseClasses extends BaseClassMap = BaseClassMap> {
    private baseClasses: BaseClassMap;
    private instanceCache: Record<string, Record<string, Adapter>>;
    private pathsToAdapters: string[];
    private loadAdapterFromPath: (path: string) => unknown;
    private config: ConfigInstance;

    constructor({pathsToAdapters, loadAdapterFromPath, baseClasses, config}: AdapterManagerOptions<BaseClasses>) {
        this.baseClasses = {};
        this.instanceCache = {};
        this.pathsToAdapters = pathsToAdapters;
        this.loadAdapterFromPath = loadAdapterFromPath;
        this.config = config;

        for (const [type, BaseClass] of Object.entries(baseClasses)) {
            if (type.includes(':')) {
                throw new errors.IncorrectUsageError({
                    message: `Adapter type "${type}" cannot contain a colon.`
                });
            }

            this.instanceCache[type] = {};
            this.baseClasses[type] = BaseClass;
        }
    }

    /**
     * Force recreation of all instances instead of reusing cached instances.
     * Use when editing config file during tests.
     */
    clearCache(): void {
        for (const key of Object.keys(this.instanceCache)) {
            this.instanceCache[key] = {};
        }
    }

    /**
     * getAdapter
     *
     * Resolves the active adapter class name and options for the given name from
     * config, then loads, validates and caches the adapter instance.
     *
     * @param name The name of the type of adapter, e.g. "storage" or
     *   "scheduling", optionally including the feature, e.g. "storage:images"
     *
     * @returns The resolved and instantiated adapter
     */
    getAdapter<Name extends AdapterName<RegistryOf<BaseClasses>>>(
        name: Name
    ): ResolvedAdapter<RegistryOf<BaseClasses>, Name>;
    getAdapter(name: string): Adapter {
        if (!name) {
            throw new errors.IncorrectUsageError({
                message: 'getAdapter must be called with an adapter name.'
            });
        }

        const {Adapter, adapterConfig, adapterType, adapterClassName} = this.loadAdapter(name);
        const adapterCache = this.instanceCache[adapterType];

        // @NOTE: example cache key value 'email:newsletters:custom-newsletter-adapter'
        const adapterCacheKey = `${name}:${adapterClassName}`;
        if (adapterCache[adapterCacheKey]) {
            return adapterCache[adapterCacheKey];
        }

        // `Adapter` is an abstract-compatible constructor type; the runtime value
        // is always a concrete class here, so instantiation is safe.
        const AdapterClass = Adapter as new (config?: object) => Adapter;
        const adapter = new AdapterClass(adapterConfig);

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

    /**
     * Resolve the active adapter class name and options for `name` from config,
     * then locate and load the adapter constructor from `pathsToAdapters`.
     *
     * Does not instantiate the adapter or touch the instance cache — shared by
     * `getAdapter` (which instantiates + caches) and `init` (which validates).
     */
    private loadAdapter(name: string): {
        Adapter: AdapterConstructor;
        adapterConfig: object;
        adapterType: string;
        adapterClassName: string;
    } {
        // Re-read config on every call so runtime config changes (and test config
        // overrides) are reflected, matching the original JS implementation.
        const adapterServiceConfig = normalizeAdapterConfig(this.config);
        const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);

        const [adapterType] = name.split(':');

        if (!this.baseClasses[adapterType]) {
            throw new errors.NotFoundError({
                message: `Unknown adapter type ${adapterType}. Please register adapter.`
            });
        }

        if (!adapterClassName) {
            throw new errors.IncorrectUsageError({
                message: `Unable to find ${adapterType} adapter in ${this.pathsToAdapters}.`
            });
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

        return {Adapter, adapterConfig: adapterConfig ?? {}, adapterType, adapterClassName};
    }

    /**
     * Validate the config of every configured adapter up-front, so
     * misconfiguration fails at boot rather than on first lazy `getAdapter`.
     *
     * Enumerates the active adapter for each registered type plus every
     * configured feature variant (e.g. `storage:media`), resolves each to a
     * distinct class + config, and calls the adapter's optional static
     * `validate` when present. All failures — bad config or a failure to load a
     * configured adapter — are aggregated into a single error so an operator
     * sees every problem at once. Types with no configured adapter are skipped;
     * presence is still enforced on use by `getAdapter`.
     */
    init(): void {
        const adapterServiceConfig = normalizeAdapterConfig(this.config);

        // 1. Enumerate every configured adapter name (active + feature variants).
        const names: string[] = [];
        for (const adapterType of Object.keys(this.baseClasses)) {
            names.push(adapterType);
            for (const feature of getConfiguredFeatures(adapterServiceConfig[adapterType])) {
                names.push(`${adapterType}:${feature}`);
            }
        }

        // 2. Resolve to distinct class + config pairs, skipping unconfigured
        //    types/features and deduping identical class+config combinations.
        const distinct = new Map<string, string>();
        for (const name of names) {
            const {adapterClassName, adapterConfig} = resolveAdapterOptions(name, adapterServiceConfig);
            if (!adapterClassName) {
                continue;
            }
            const [adapterType] = name.split(':');
            const key = `${adapterType}:${adapterClassName}:${JSON.stringify(adapterConfig ?? {})}`;
            if (!distinct.has(key)) {
                distinct.set(key, name);
            }
        }

        // 3. Load + validate each distinct adapter, aggregating all failures.
        const failures: {name: string; err: Error}[] = [];
        for (const name of distinct.values()) {
            try {
                const {Adapter, adapterConfig} = this.loadAdapter(name);
                if (typeof Adapter.validate === 'function') {
                    Adapter.validate(adapterConfig);
                }
            } catch (err) {
                failures.push({name, err: err as Error});
            }
        }

        if (failures.length > 0) {
            const details = failures.map(({name, err}) => `- ${name}: ${err.message}`).join('\n');
            throw new errors.IncorrectUsageError({
                message: `Invalid adapter configuration:\n${details}`,
                errorDetails: failures.map(({name, err}) => ({adapter: name, message: err.message}))
            });
        }
    }
}
