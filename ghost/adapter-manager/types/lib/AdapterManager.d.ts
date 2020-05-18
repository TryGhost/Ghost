export = AdapterManager;
declare class AdapterManager {
    /**
     * @param {object} config
     * @param {string[]} config.pathsToAdapters The paths to check, e.g. ['content/adapters', 'core/server/adapters']
     * @param {(path: string) => AdapterConstructor} config.loadAdapterFromPath A function to load adapters, e.g. global.require
     */
    constructor({ pathsToAdapters, loadAdapterFromPath }: {
        pathsToAdapters: string[];
        loadAdapterFromPath: (path: string) => AdapterConstructor;
    });
    /**
     * @private
     * @type {Object.<string, AdapterConstructor>}
     */
    private baseClasses;
    /**
     * @private
     * @type {Object.<string, Object.<string, Adapter>>}
     */
    private instanceCache;
    /**
     * @private
     * @type {string[]}
     */
    private pathsToAdapters;
    /**
     * @private
     * @type {(path: string) => AdapterConstructor}
     */
    private loadAdapterFromPath;
    /**
     * Register an adapter type and the corresponding base class. Must be called before requesting adapters of that type
     *
     * @param {string} type The name for the type of adapter
     * @param {AdapterConstructor} BaseClass The class from which all adapters of this type must extend
     */
    registerAdapter(type: string, BaseClass: AdapterConstructor): void;
    /**
     * getAdapter
     *
     * @param {string} adapterType The type of adapter, e.g. "storage" or "scheduling"
     * @param {string} adapterName The active adapter, e.g. "LocalFileStorage"
     * @param {object} config The config the adapter should be instantiated with
     *
     * @returns {Adapter} The resolved and instantiated adapter
     */
    getAdapter(adapterType: string, adapterName: string, config: object): Adapter;
}
declare namespace AdapterManager {
    export { AdapterConstructor, Adapter };
}
type AdapterConstructor = new (arg1: object) => Adapter;
type Adapter = {
    requiredFns: string[];
};
