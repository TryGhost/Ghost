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
     * getAdapter
     *
     * @param {string} adapterType The type of adapter, e.g. "storage" or "scheduling"
     * @param {string} adapterName The active adapter, e.g. "LocalFileStorage"
     * @param {object} config The config the adapter should be instantiated with
     *
     * @returns {Adapter} The resolved and instantiated adapter
     */
    getAdapter(adapterType, adapterName, config) {
        if (!adapterType || !adapterName) {
            throw new errors.IncorrectUsageError({
                message: 'getAdapter must be called with a adapterType and a name.'
            });
        }

        const adapterCache = this.instanceCache[adapterType];

        if (!adapterCache) {
            throw new errors.NotFoundError({
                message: `Unknown adapter type ${adapterType}. Please register adapter.`
            });
        }

        if (adapterCache[adapterName]) {
            return adapterCache[adapterName];
        }

        /** @type AdapterConstructor */
        let Adapter;
        for (const pathToAdapters of this.pathsToAdapters) {
            const pathToAdapter = path.join(pathToAdapters, adapterType, adapterName);
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
                message: `Unable to find ${adapterType} adapter ${adapterName} in ${this.pathsToAdapters}.`
            });
        }

        const adapter = new Adapter(config);

        if (!(adapter instanceof this.baseClasses[adapterType])) {
            if (Object.getPrototypeOf(Adapter).name !== this.baseClasses[adapterType].name) {
                throw new errors.IncorrectUsageError({
                    message: `${adapterType} adapter ${adapterName} does not inherit from the base class.`
                });
            }
        }

        if (!adapter.requiredFns) {
            throw new errors.IncorrectUsageError({
                message: `${adapterType} adapter ${adapterName} does not have the requiredFns.`
            });
        }

        for (const requiredFn of adapter.requiredFns) {
            if (typeof adapter[requiredFn] !== 'function') {
                throw new errors.IncorrectUsageError({
                    message: `${adapterType} adapter ${adapterName} is missing the ${requiredFn} method.`
                });
            }
        }

        adapterCache[adapterName] = adapter;

        return adapter;
    }
};
