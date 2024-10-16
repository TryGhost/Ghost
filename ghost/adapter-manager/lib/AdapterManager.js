const path = require('path');
const errors = require('@tryghost/errors');

/**
 * @typedef { function(new: Adapter, object) } AdapterConstructor
 */

/**
 * @typedef {object} Adapter
 * @prop {string[]} requiredFns
 */

module.exports = class AdapterManager {
    /**
     * @param {object} config
     * @param {string[]} config.pathsToAdapters The paths to check, e.g. ['content/adapters', 'core/server/adapters']
     * @param {(path: string) => AdapterConstructor} config.loadAdapterFromPath A function to load adapters, e.g. global.require
     */
    constructor({pathsToAdapters, loadAdapterFromPath}) {
        /**
         * @private
         * @type {Object.<string, AdapterConstructor>}
         */
        this.baseClasses = {};

        /**
         * @private
         * @type {Object.<string, Object.<string, Adapter>>}
         */
        this.instanceCache = {};

        /**
         * @private
         * @type {string[]}
         */
        this.pathsToAdapters = pathsToAdapters;

        /**
         * @private
         * @type {(path: string) => AdapterConstructor}
         */
        this.loadAdapterFromPath = loadAdapterFromPath;
    }

    /**
     * Register an adapter type and the corresponding base class. Must be called before requesting adapters of that type
     *
     * @param {string} type The name for the type of adapter
     * @param {AdapterConstructor} BaseClass The class from which all adapters of this type must extend
     */
    registerAdapter(type, BaseClass) {
        this.instanceCache[type] = {};
        this.baseClasses[type] = BaseClass;
    }

    /**
     * Force recreation of all instances instead of reusing cached instances. Use when editing config file during tests.
     */
    clearInstanceCache() {
        for (const key of Object.keys(this.instanceCache)) {
            this.instanceCache[key] = {};
        }
    }

    /**
     * getAdapter
     *
     * @param {string} adapterName The name of the type of adapter, e.g. "storage" or "scheduling", optionally including the feature, e.g. "storage:files"
     * @param {string} adapterClassName The active adapter instance class name e.g. "LocalFileStorage"
     * @param {object} [config] The config the adapter could be instantiated with
     *
     * @returns {Adapter} The resolved and instantiated adapter
     */
    getAdapter(adapterName, adapterClassName, config) {
        if (!adapterName || !adapterClassName) {
            throw new errors.IncorrectUsageError({
                message: 'getAdapter must be called with a adapterName and a adapterClassName.'
            });
        }

        let adapterType;
        if (adapterName.includes(':')) {
            [adapterType] = adapterName.split(':');
        } else {
            adapterType = adapterName;
        }

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

        /** @type AdapterConstructor */
        let Adapter;
        for (const pathToAdapters of this.pathsToAdapters) {
            const pathToAdapter = path.join(pathToAdapters, adapterType, adapterClassName);
            try {
                Adapter = this.loadAdapterFromPath(pathToAdapter);
                if (Adapter) {
                    break;
                }
            } catch (err) {
                // Catch runtime errors
                if (err.code !== 'MODULE_NOT_FOUND') {
                    throw new errors.IncorrectUsageError({err});
                }

                // Catch missing dependencies BUT NOT missing adapter
                if (!err.message.includes(pathToAdapter)) {
                    throw new errors.IncorrectUsageError({
                        message: `You are missing dependencies in your adapter ${pathToAdapter}`,
                        err
                    });
                }
            }
        }

        if (!Adapter) {
            throw new errors.IncorrectUsageError({
                message: `Unable to find ${adapterType} adapter ${adapterClassName} in ${this.pathsToAdapters}.`
            });
        }

        const adapter = new Adapter(config);

        if (!(adapter instanceof this.baseClasses[adapterType])) {
            if (Object.getPrototypeOf(Adapter).name !== this.baseClasses[adapterType].name) {
                throw new errors.IncorrectUsageError({
                    message: `${adapterType} adapter ${adapterClassName} does not inherit from the base class.`
                });
            }
        }

        if (!adapter.requiredFns) {
            throw new errors.IncorrectUsageError({
                message: `${adapterType} adapter ${adapterClassName} does not have the requiredFns.`
            });
        }

        for (const requiredFn of adapter.requiredFns) {
            if (typeof adapter[requiredFn] !== 'function') {
                throw new errors.IncorrectUsageError({
                    message: `${adapterType} adapter ${adapterClassName} is missing the ${requiredFn} method.`
                });
            }
        }

        adapterCache[adapterCacheKey] = adapter;

        return adapter;
    }
};
